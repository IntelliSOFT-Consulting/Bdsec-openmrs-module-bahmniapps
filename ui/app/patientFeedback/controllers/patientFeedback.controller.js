angular.module("bahmni.patientFeedback")
    .controller("patientFeedbackController", ["$scope", "feedbackService"], function($scope, FeedbackService){
        $scope.feedback = {};
        $scope.submitFeedback = function () {
            FeedbackService.saveFeedback($scope.feedback)
                .then(function(response) {
                    alert("Feedback submitted successfully");
                    $scope.feedback = {};
                })
        }
    })