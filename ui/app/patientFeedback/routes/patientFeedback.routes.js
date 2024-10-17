angular.module("bahmni.patientFeedback")
    .config(["$stateProvider", function($stateProvider){
        $stateProvider.state("feedback", {
            url: "/feedback",
            templateUrl: "patientFeedback/views/patientFeedback.html",
            controller: "patientFeedbackController"
        })
    }])