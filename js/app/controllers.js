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
	  // инициализируем joint.dia.Graph (коллекцию все моделей диаграммы)
      var graph = new joint.dia.Graph;
      // инициализируем joint.dia.Paper (представление для всех элементов диаграммы)
      var paper = new joint.dia.Paper({
          el: $('#paper'), // привязываем к контретному элементу страницы
          width: 900,
          height: 600,
          gridSize: 5,
          model: graph
      });

      // объявляем переменную для шаблонов uml
      var uml = joint.shapes.uml;
      // объявляем переменную, которая будет хранить текущий выбранный класс (для последующего его обновления)
      var curClass = {};
      // объявляем объект, который будет хранить все классы диаграммы
      var classes = {};      
      // переменная для закрытия DOM элементов для работы с классом
      $scope.showClassProperties = {
      	condition: false,
      	message: "Элемент не выбран"
      };
      
      // событие скрола мышки
      paper.$el.on('mousewheel DOMMouseScroll', onMouseWheel);

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
	   // функция сброса всех условий выбора
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
      
      // событие клика на элемент диаграммы
      paper.on('cell:pointerdown', function(cellView, evt, x, y) {        
        if (cellView.model.toJSON().umlType == "Class"){
          var className = evt.target.parentNode.getAttribute('class');
          $scope.statusClassNameOpen  = true;
          // если кликнули на svg элемент удаления класса
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
          // если перед кликом была выбрана связь
          if ($scope.referenceCondition == true) {
          	// если это первый класс для связи
            if (!$scope.source) {            
              $scope.source = cellView.model.toJSON().id;            
            }
            else {
              $scope.target = cellView.model.toJSON().id;            
              if ($scope.source != $scope.target) {
              	// switch для создания связей
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
          //присваиваем текущий класс        
          curClass = cellView.model.toJSON().id;
          // инициалириуем элементы для работы с классом
          $scope.classMethods = cellView.model.toJSON().methods;
          $scope.classAttributes = cellView.model.toJSON().attributes;
          $scope.className = { 
            name: cellView.model.toJSON().name
          };
          
           $scope.size = {
            width: cellView.model.toJSON().size.width,
            height: cellView.model.toJSON().size.height
          }         
          $scope.showClassProperties.condition = true;            
          typesInit();
          $scope.$apply();
        }        
      });      
	  // событие клика на пустую область диаграммы
      paper.on('blank:pointerdown', function(evt, xPosition, yPosition) {
      	// закрываем DOM элементы для работы с классом        
      	$scope.showClassProperties.condition = false;
      	// switch для создания класса      	
        switch (true) {
          case $scope.classCondition:            
            var newClass = new uml.Class();
            //добавляем новый класс в объект с классами               
            classes[newClass.id] = newClass;
            //функция инициализации класса          
            classInit();
            $scope.classCondition = false;
            $scope.statusClassNameOpen  = true; 
            break;
          case $scope.interfaceCondition:
            var newClass = new uml.Interface();
            //добавляем новый класс в объект с классами 
            classes[newClass.id] = newClass;
            //функция инициализации класса   
            classInit(); 
            $scope.interfaceCondition = false;
            $scope.statusClassNameOpen = true;
            break;
          case $scope.abstractCondition:
            var newClass = new uml.Abstract();
            //добавляем новый класс в объект с классами 
            classes[newClass.id] = newClass;
            //функция инициализации класса   
            classInit(); 
            $scope.abstractCondition = false;
            $scope.statusClassNameOpen  = true;
            break;
          case $scope.referenceCondition:
            $scope.refreshConditions();            
            break;
        }

        function classInit() {
          //добавляем необходимые атрибуты классу         
          classes[newClass.id].attributes.position = { x:xPosition  , y: yPosition};
          classes[newClass.id].attributes.size= { width: 150, height: 100 };
          classes[newClass.id].setClassName("NewClass");
          classes[newClass.id].attributes.attributes = [];
          classes[newClass.id].attributes.methods = [];
          //добавляем новый класс в коллекция элементов                   
          graph.addCell(classes[newClass.id]);
          //присваиваем текущий класс          
          curClass = newClass.id;
          // инициалириуем DOM элементы  для работы с классом
          $scope.showClassProperties.condition = true;   
          $scope.className = {name: "NewClass"};
          $scope.classMethods = [];
          $scope.classAttributes = [];
          typesInit();
          $scope.size = {
            width: "150",
            height: "100"
          }                  
          $scope.$apply();                  
        }                            
      });
	  // функция инициализирующая типы: types, methodTypes и typesWithClasses
      function typesInit() {
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
      // изменение размеров класса
      $scope.changeSize = function(){           	
      	classes[curClass].resize($scope.size.width, $scope.size.height);      	
      }
      // удаление класса
      $scope.deleteClass = function() {        
        classes[curClass].remove();             
        delete classes[curClass];       
        $scope.className = {};
        $scope.classMethods = [];
        $scope.classAttributes = [];
        $scope.showClassProperties.condition = false;
                 
      }
      // изменение имени, методов или атрибутов класса
      $scope.changeClassDetails = function() {
        classes[curClass].setClassName($scope.className.name);        
        updateAttributes(); 
        updateMethods();

      };
      // добавление атрибута
      $scope.addAtr = function() {
        newAttribute = {
          name: "Newattribute",
          type: null
        };
        $scope.classAttributes.push(newAttribute);        
        updateAttributes();        
      };
      // удаление атрибуты
      $scope.deleteAtr = function(index) {        
        $scope.classAttributes.splice(index, 1);        
        updateAttributes();        
      };
      // добавление метода
      $scope.addMethod = function(){
        newMethod = {
          name: "NewMethod",
          type: "Void",
          parameters: []
        };
        $scope.classMethods.push(newMethod);                   
        updateMethods();
      };
      // удаление метода
      $scope.deleteMethod = function(index){              
        $scope.classMethods.splice(index, 1);                
        updateMethods(); 
      }
      // добавление параметра
      $scope.addParam = function(index) {
        newParam = {
          name: "NewParam",
          type: null
        };
        $scope.classMethods[index].parameters.push(newParam);            
        updateMethods();
      }
      // удаление параметра
      $scope.deleteParam = function(index, parent) {
        $scope.classMethods[parent.$index].parameters.splice(index, 1);            
        updateMethods();
      };      
      // функция обновления арибутов у элемента диаграммы
      function updateAttributes(){
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
      // функция обновления методов у элемента диаграммы
      function updateMethods(){
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
      // экспорт xmi
	  $scope.exportXMI = function(){
	  	// вызываем сервис XMIService, передаем в него все элементы диаграммы, возвратит XMI в строке
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

	});
	
	
