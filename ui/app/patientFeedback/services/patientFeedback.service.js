angular.module("bahmni.patientFeedback")
    .factory("FeedbackService", ["$http",  function($http){
        var saveFeedback = function(feedback){
            return $http.post("/bahmni/api/feedback", feedback)
        };
        return {
            saveFeedback: saveFeedback
        }
    }])