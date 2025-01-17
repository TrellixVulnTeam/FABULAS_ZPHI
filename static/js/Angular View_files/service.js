//service module
var serviceModule = angular.module('ServiceModule', []);

//data & functions shared among controllers
serviceModule.factory("service", ['$http', function($http) {
  return { 
    // put all global data here
    global: { 
      user: 'test' 
    },
    login: function(inputs) {
      return $http.post('/static/login', inputs);
      // return $http.jsonp('/static/login?callback=JSON_CALLBACK&'+
      //   decodeURIComponent($.param(inputs)));
    },
    logout: function() {
      return $http.post('/logout');
      // return $http.jsonp('/logout?callback=JSON_CALLBACK');
    },
    getUsers: function() {
      return $http.post('/json/users');
      // return $http.jsonp('/json/users?callback=JSON_CALLBACK');
    },
    queryUsers: function(inputs) {
      return $http.post('/json/users/query', inputs);
      // return $http.jsonp('/json/users/query?callback=JSON_CALLBACK&'+
      //   decodeURIComponent($.param(inputs)));
    },
    createUser: function(inputs) {
      // alert("Service createUser");
      $http.post('/static/json/users/create', inputs);
      // return $http.jsonp('/static/json/users/create?callback=JSON_CALLBACK&'+
      //   decodeURIComponent($.param(inputs)));
    },
    deleteUser: function(id) {
      return $http.post('/json/users/delete/'+id);
      // return $http.jsonp('/json/users/delete/'+id+'?callback=JSON_CALLBACK');
    }
  };
}]);