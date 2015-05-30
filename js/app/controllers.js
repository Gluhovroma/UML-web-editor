// var umlEditorApp = angular.module('umlEditorApp', ['ui.bootstrap','cgNotify']);
angular.module('umlEditorApp', ['ui.bootstrap','cgNotify']);
  angular.module('umlEditorApp').controller('umlController',
	function ($scope, $http, notify, XMIService){      


		  notify({
  		        message: "Спасибо, что посетили проект",		            
  		        templateUrl: '',
  		        position: 'left',
  		        classes: '',
  		        duration: 5000
        	  }); 

      var graph = new joint.dia.Graph;
      var paper = new joint.dia.Paper({
          el: $('#paper'),
          width: 2000,
          height: 2000,
          gridSize: 5,
          model: graph
      });
      paper.$el.on('mousewheel DOMMouseScroll', onMouseWheel);

      var uml = joint.shapes.uml;

      var curClass = {};

      var classes = {};
      var relations = [];

      $scope.showClassProperties = {
      	condition: false,
      	message: "Элемент не выбран"
      };
      
      function onMouseWheel(e) {      	
  	    e.preventDefault();
  	    e = e.originalEvent;	    
  	    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) / 50;
  	    var offsetX = (e.offsetX || e.clientX - $(this).offset().left); // offsetX is not defined in FF
  	    var offsetY = (e.offsetY || e.clientY - $(this).offset().top); // offsetY is not defined in FF
  	    var p = offsetToLocalPoint(offsetX, offsetY);
  	    var newScale = V(paper.viewport).scale().sx + delta; // the current paper scale changed by delta
  	    if (newScale > 0.4 && newScale < 2) {
  	        paper.setOrigin(0, 0); // reset the previous viewport translation
  	        paper.scale(newScale, newScale, p.x, p.y);
  	    }
  	    function offsetToLocalPoint(x, y) {
  		    var svgPoint = paper.svg.createSVGPoint();
  		    svgPoint.x = x;
  		    svgPoint.y = y;
  		    // Transform point into the viewport coordinate system.
  		    var pointTransformed = svgPoint.matrixTransform(paper.viewport.getCTM().inverse());
  		    return pointTransformed;
  		  }
	   }		

      $scope.refreshConditions = function(){
      	
        $scope.classCondition = false;
        $scope.interfaceCondition = false;
        $scope.abstractCondition = false;
        $scope.associationCondition = false;
        $scope.compositionCondition = false;
        $scope.generalizationCondition = false;
        $scope.referenceCondition = false;
        $scope.source = undefined;
        $scope.target = undefined;
      };

      $scope.refreshConditions();
      $scope.test = function(){
        console.log("da");
      }
      $scope.test2 = function(){
        console.log('da2');
      }
      
      paper.on('cell:pointerdown', function(cellView, evt, x, y) {        
        if (cellView.model.toJSON().umlType == "Class"){
          var className = evt.target.parentNode.getAttribute('class');
          $scope.statusClass = true;
          if (className == 'element-tool-remove') {           
            curClass = cellView.model.toJSON().id;
            $scope.deleteClass();
            $scope.className = {};
            $scope.classMethods = [];
            $scope.classAttributes = [];
            $scope.showClassProperties.condition = false;
            $scope.$apply();
            return;
          }
          if ($scope.referenceCondition == true) {
            if (!$scope.source) {            
              $scope.source = cellView.model.toJSON().id;            
            }
            else if ($scope.source) {
              $scope.target = cellView.model.toJSON().id;            
              if ($scope.source != $scope.target) {
                switch (true) {
                  case $scope.associationCondition:
                    var assosiation = new uml.Association({
                                                            source: {id: $scope.source}, 
                                                            target: {id: $scope.target},
                                                            labels: [
                                                                      { position: 25, attrs: { text: { text: '*' } } },        
                                                                      { position: -25, attrs: { text: { text: '1' } } }]
                                                          });
                    graph.addCell(assosiation);
                    $scope.refreshConditions();            
                    break;
                  case $scope.compositionCondition:
                    var composition = new uml.Composition({
                                                            source: {id: $scope.source}, 
                                                            target: {id: $scope.target},
                                                            labels: [
                                                                      { position: 25, attrs: { text: { text: '*' } } },        
                                                                      { position: -25, attrs: { text: { text: '1' } } }]
                                                          });
                    graph.addCell(composition);
                    $scope.refreshConditions();            
                    break;
                  case $scope.generalizationCondition:
                    var generalization = new uml.Generalization({
                                                                  source: {id: $scope.source}, 
                                                                  target: {id: $scope.target}
                                                                });
                    graph.addCell(generalization);
                    $scope.refreshConditions();            
                    break;
                }                
              }
              else {              	
               	notify({
		            message: "на данный момент такая связь не предусмотрена",		            
		            templateUrl: '',
		            position: 'right',
		            classes: "alert-danger",
		            duration: 5000
        		    });                
               
                $scope.refreshConditions();
              }
            }        
          }        
          curClass = cellView.model.toJSON().id;
          $scope.classMethods = cellView.model.toJSON().methods;
          $scope.classAttributes = cellView.model.toJSON().attributes;
          $scope.className = { 
            name: cellView.model.toJSON().name
          };
          console.log(cellView.model.toJSON());
           $scope.size = {
            width: cellView.model.toJSON().size.width,
            height: cellView.model.toJSON().size.height
          }
         
          
          $scope.showClassProperties.condition = true;            
          $scope.typesInit();
          $scope.$apply();
        }        
      });      

      paper.on('blank:pointerdown', function(evt, xPosition, yPosition) {        
      	$scope.showClassProperties.condition = false;      	
        switch (true) {
          case $scope.classCondition:            
            var newClass = new uml.Class();               
            classes[newClass.id] = newClass;          
            classInit();
            $scope.classCondition = false;
            $scope.statusClass = true; 
            break;
          case $scope.interfaceCondition:
            var newClass = new uml.Interface();
            classes[newClass.id] = newClass; 
            classInit(); 
            $scope.interfaceCondition = false;
            $scope.statusClass = true;
            break;
          case $scope.abstractCondition:
            var newClass = new uml.Abstract();
            classes[newClass.id] = newClass;
            classInit(); 
            $scope.abstractCondition = false;
            $scope.statusClass = true;
            break;
          case $scope.referenceCondition:
            $scope.refreshConditions();            
            break;
        }
        function classInit() {         
          classes[newClass.id].attributes.position = { x:xPosition  , y: yPosition};
          classes[newClass.id].attributes.size= { width: 150, height: 100 };
          classes[newClass.id].setClassName("NewClass");
          classes[newClass.id].attributes.attributes = [];
          classes[newClass.id].attributes.methods = [];                   
          graph.addCell(classes[newClass.id]);        
          curClass = newClass.id;
          $scope.showClassProperties.condition = true;   
          $scope.className = {name: "NewClass"};
          $scope.classMethods = [];
          $scope.classAttributes = [];
          $scope.typesInit();
          $scope.size = {
            width: "100",
            height: "150"
          }
                  
          $scope.$apply();                  
        }                            
      });
            
      $scope.changeSize = function(){      
           	
      	classes[curClass].resize($scope.size.width, $scope.size.height);      	
      }
      $scope.deleteClass = function() {        
        classes[curClass].remove();             
        delete classes[curClass];        
        console.log(graph.toJSON().cells);
        console.log(classes);
        $scope.className = {};
        $scope.classMethods = [];
        $scope.classAttributes = [];
        $scope.showClassProperties.condition = false;
        console.log($scope.className);          
      }

      $scope.changeClassDetails = function() {
        classes[curClass].setClassName($scope.className.name);        
        $scope.updateAttributes(); 
        $scope.updateMethods();

      };

      $scope.addAtr = function() {
        newAttribute = {
          name: "New attribute",
          type: null
        };
        $scope.classAttributes.push(newAttribute);        
        $scope.updateAttributes();        
      };

      $scope.deleteAtr = function(index) {        
        $scope.classAttributes.splice(index, 1);        
        $scope.updateAttributes();        
      };

      $scope.addMethod = function(){
        newMethod = {
          name: "NewMethod",
          type: "Void",
          parameters: []
        };
        $scope.classMethods.push(newMethod);                   
        $scope.updateMethods();
      };

      $scope.deleteMethod = function(index){              
        $scope.classMethods.splice(index, 1);                
        $scope.updateMethods(); 
      }

      $scope.addParam = function(index) {
        newParam = {
          name: "NewParam",
          type: null
        };
        $scope.classMethods[index].parameters.push(newParam);            
        $scope.updateMethods();
      }

      $scope.deleteParam = function(index, parent) {
        $scope.classMethods[parent.$index].parameters.splice(index, 1);            
        $scope.updateMethods();
      };
      
      $scope.exportXMI = function(){
        var content = XMIService.export(graph.toJSON().cells);
        if (content){
          var blob = new Blob([content], { type: 'text/plain' });
          var downloadLink = angular.element('<a></a>');
          downloadLink.attr('href',window.URL.createObjectURL(blob));
          downloadLink.attr('download', 'diagram.xmi');
          downloadLink[0].click();         
          downloadLink = undefined;
        }
      }
      $scope.typesInit = function() {
        $scope.types = [ 
          "String", 
          "Int", 
          "Boolean", 
          "Date",
          "Double",
          "Long",
          "Float",
          "Short"
        ];
        $scope.methodTypes = ["Void"];
        $scope.typesWithClasses = []; 
        _.each($scope.types, function(type) {           
          $scope.typesWithClasses.push(type);
          $scope.methodTypes.push(type);                    
        });
        if (graph.toJSON().cells.length != 0) {
          _.each(graph.toJSON().cells, function(classItem) {
            if (classItem.umlType == "Class"){
              $scope.typesWithClasses.push(classItem.name);
              $scope.methodTypes.push(classItem.name)
            }          
          });
        };     
      };

      $scope.updateAttributes = function(){
        var attributes = []; 
        classes[curClass].attributes.attributes=$scope.classAttributes;               
        _.each($scope.classAttributes, function(attribute) {
          var attributeString = attribute.name;
          if (attribute.type !=null) {
            attributeString = attributeString + ': ' + attribute.type;
          }
          attributes.push(attributeString);   
        });
        classes[curClass].setAttrs(attributes);
      };

      $scope.updateMethods = function(){
        var methods = [];
        classes[curClass].attributes.methods = $scope.classMethods;             
        _.each($scope.classMethods, function(method){
          var parametersString = "";
          if (method.parameters.length != 0){
            for (var i = 0; i < method.parameters.length; i++) {
              if (i == 0){
                parametersString = method.parameters[0].name;
                if (method.parameters[0].type != null){
                  parametersString = parametersString + ': ' + method.parameters[0].type;
                }
              }
              else {
                parametersString = parametersString + ', ' + method.parameters[i].name;
                if (method.parameters[i].type != null){
                  parametersString = parametersString + ': ' + method.parameters[i].type;
                }
              }
            };                
          };                       
          var methodString = method.name + '(' + parametersString +'): ' + method.type;
          methods.push(methodString);   
        });        
        classes[curClass].setMethods(methods);
      };

	});
	
	
