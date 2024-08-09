'use strict';

angular.module('bahmni.clinical')
    .directive('patientContext', ['$state', '$translate', '$sce', 'patientService', 'spinner', 'appService', '$q', '$http', function ($state, $translate, $sce, patientService, spinner, appService, $q, $http) {
        var controller = function ($scope, $rootScope) {
            var patientContextConfig = appService.getAppDescriptor().getConfigValue('patientContext') || {};
            $scope.initPromise = patientService.getPatientContext($scope.patient.uuid, $state.params.enrollment, patientContextConfig.personAttributes, patientContextConfig.programAttributes, patientContextConfig.additionalPatientIdentifiers);
            $scope.allowNavigation = angular.isDefined($scope.isConsultation);
            $scope.initPromise.then(function (response) {
                $scope.patientContext = response.data;
                var programAttributes = $scope.patientContext.programAttributes;
                var personAttributes = $scope.patientContext.personAttributes;
                convertBooleanValuesToEnglish(personAttributes);
                convertBooleanValuesToEnglish(programAttributes);
                translateAttributes(personAttributes);
                translateAttributes(programAttributes);
                var preferredIdentifier = patientContextConfig.preferredIdentifier;
                if (preferredIdentifier) {
                    if (programAttributes[preferredIdentifier]) {
                        $scope.patientContext.identifier = programAttributes[preferredIdentifier].value;
                        delete programAttributes[preferredIdentifier];
                    } else if (personAttributes[preferredIdentifier]) {
                        $scope.patientContext.identifier = personAttributes[preferredIdentifier].value;
                        delete personAttributes[preferredIdentifier];
                    }
                }

                $scope.showNameAndImage = $scope.showNameAndImage !== undefined ? $scope.showNameAndImage : true;
                if ($scope.showNameAndImage) {
                    $scope.patientContext.image = Bahmni.Common.Constants.patientImageUrlByPatientUuid + $scope.patientContext.uuid;
                }
                $scope.patientContext.gender = $rootScope.genderMap[$scope.patientContext.gender];
            });

            var getPatientWalletInfo = function () {
                var params = {
                    // eslint-disable-next-line key-spacing
                    identifier : $scope.patient.identifier
                    // identifier: patidentifier
                };
                return $http.get('/openmrs/ws/rest/v1/odooconnector/patient-balance', {
                    method: "GET",
                    params: params,
                    withCredentials: true
                });
            };
            $q.all([getPatientWalletInfo()]).then(function (response) {
                $scope.balanceInfo = response[0].data;
                if (($scope.balanceInfo.balance != null) && ($scope.balanceInfo.max_top_up != null)) {
                    $scope.accountBalance = $scope.balanceInfo.balance;
                    $scope.accountStatus = 'Active';
                    $scope.expenditure = (($scope.balanceInfo.balance / $scope.balanceInfo.max_top_up) * 100).toFixed(1);
                    $scope.percentageSpent = (100 - $scope.expenditure);
                    console.log("Account Balance", $scope.accountBalance);
                    console.log("Percentage spent", $scope.percentageSpent);
                } else {
                    $scope.accountBalance = '0.00';
                    $scope.accountStatus = 'Dormant';
                }
            });

            $scope.navigate = function () {
                if ($scope.isConsultation) {
                    $scope.$parent.$parent.$broadcast("patientContext:goToPatientDashboard");
                } else {
                    $state.go("search.patientsearch");
                }
            };
        };

        var link = function ($scope, element) {
            spinner.forPromise($scope.initPromise, element);
        };

        var convertBooleanValuesToEnglish = function (attributes) {
            var booleanMap = {'true': 'Yes', 'false': 'No'};
            _.forEach(attributes, function (value) {
                value.value = booleanMap[value.value] ? booleanMap[value.value] : value.value;
            });
        };

        var translateAttributes = function (attributes) {
            _.forEach(attributes, function (attribute, key) {
                var translatedName = Bahmni.Common.Util.TranslationUtil.translateAttribute(key, Bahmni.Common.Constants.clinical, $translate);
                attribute.description = translatedName;
            });
        };

        return {
            restrict: 'E',
            templateUrl: "displaycontrols/patientContext/views/patientContext.html",
            scope: {
                patient: "=",
                showNameAndImage: "=?",
                isConsultation: "=?"
            },
            controller: controller,
            link: link
        };
    }]);
