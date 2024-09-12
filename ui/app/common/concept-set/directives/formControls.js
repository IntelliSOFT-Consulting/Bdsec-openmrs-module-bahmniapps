'use strict';

angular.module('bahmni.common.conceptSet')
    .directive('formControls', ['formService', 'spinner', '$timeout', '$translate',
        function (formService, spinner, $timeout, $translate) {
            var loadedFormDetails = {};
            var loadedFormTranslations = {};
            var unMountReactContainer = function (formUuid) {
                var reactContainerElement = angular.element(document.getElementById(formUuid));
                reactContainerElement.on('$destroy', function () {
                    unMountForm(document.getElementById(formUuid));
                });
            };

            var controller = function ($scope) {
                var formUuid = $scope.form.formUuid;
                var formVersion = $scope.form.formVersion;
                var formName = $scope.form.formName;
                var formObservations = $scope.form.observations;
                var collapse = $scope.form.collapseInnerSections && $scope.form.collapseInnerSections.value;
                var validateForm = $scope.validateForm || false;
                var locale = $translate.use();

                if (!loadedFormDetails[formUuid]) {
                    spinner.forPromise(formService.getFormDetail(formUuid, { v: "custom:(resources:(value))" })
                        .then(function (response) {
                            var formDetailsAsString = _.get(response, 'data.resources[0].value');
                            if (formDetailsAsString) {
                                var formDetails = JSON.parse(formDetailsAsString);
                                formDetails.version = formVersion;
                                loadedFormDetails[formUuid] = formDetails;
                                var formParams = { formName: formName, formVersion: formVersion, locale: locale, formUuid: formUuid };
                                $scope.form.events = formDetails.events;
                                spinner.forPromise(formService.getFormTranslations(formDetails.translationsUrl, formParams)
                                    .then(function (response) {
                                        var formTranslations = !_.isEmpty(response.data) ? response.data[0] : {};
                                        loadedFormTranslations[formUuid] = formTranslations;
                                        $scope.form.component = renderWithControls(formDetails, formObservations,
                                            formUuid, collapse, $scope.patient, validateForm, locale, formTranslations);
                                    }, function () {
                                        var formTranslations = {};
                                        loadedFormTranslations[formUuid] = formTranslations;
                                        $scope.form.component = renderWithControls(formDetails, formObservations,
                                            formUuid, collapse, $scope.patient, validateForm, locale, formTranslations);
                                    })
                                );
                            }
                            unMountReactContainer($scope.form.formUuid);
                        })
                    );
                } else {
                    $timeout(function () {
                        $scope.form.events = loadedFormDetails[formUuid].events;
                        $scope.form.component = renderWithControls(loadedFormDetails[formUuid], formObservations,
                            formUuid, collapse, $scope.patient, validateForm, locale, loadedFormTranslations[formUuid]);
                        unMountReactContainer($scope.form.formUuid);
                    }, 0, false);
                }

                $scope.$watch('form.collapseInnerSections', function () {
                    var collapse = $scope.form.collapseInnerSections && $scope.form.collapseInnerSections.value;
                    if (loadedFormDetails[formUuid]) {
                        $scope.form.component = renderWithControls(loadedFormDetails[formUuid], formObservations,
                            formUuid, collapse, $scope.patient, validateForm, locale, loadedFormTranslations[formUuid]);
                    }
                });

                function findItemWithText () {
                    const items = document.querySelectorAll('.form-field-wrap');
                    for (let item of items) {
                        if (itemContainsText(item, "Eye to be Operated Co-ordinates")) {
                            const eyeContainer = document.createElement('div');
                            eyeContainer.id = 'eye-container';
                            const eye = document.createElement('img');
                            eye.id = 'eye';
                            eye.src = '/bahmni/images/eye.png';
                            const drawingArea = document.createElement('canvas');
                            drawingArea.id = 'drawing-area';

                            const clearBtn = document.createElement('button');
                            clearBtn.id = 'clear-btn';
                            clearBtn.textContent = 'Clear';
                            clearBtn.className = 'drawing-btn';

                            eyeContainer.appendChild(eye);
                            eyeContainer.appendChild(drawingArea);
                            eyeContainer.appendChild(clearBtn);
                            item.appendChild(eyeContainer);
                            item.classList.add('eye-container');

                            setupDrawing();

                            const obsControlField = item.querySelector('.obs-control-field');
                            if (obsControlField) {
                                obsControlField.style.display = 'none';
                            }

                            return item;
                        }
                    }
                    return null;
                }

                function setupDrawing () {
                    const canvas = document.getElementById('drawing-area');
                    const ctx = canvas.getContext('2d');
                    const clearBtn = document.getElementById('clear-btn');
                    const loadBtn = document.getElementById('load-btn');
                    let isDrawing = false;
                    let coordinates = [];

                    function resizeCanvas () {
                        canvas.width = canvas.offsetWidth;
                        canvas.height = canvas.offsetHeight;
                    }

                    function startDrawing (e) {
                        isDrawing = true;
                        draw(e);
                    }

                    function stopDrawing () {
                        isDrawing = false;
                        ctx.beginPath();
                    }

                    function draw (e) {
                        if (!isDrawing) return;

                        const rect = canvas.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        ctx.lineWidth = 2;
                        ctx.lineCap = 'round';
                        ctx.strokeStyle = 'red';

                        ctx.lineTo(x, y);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x, y);

                        coordinates.push({ x, y });
                    }

                    function clearDrawing () {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        coordinates = [];
                    }

                    function redrawFromCoordinates () {
                        ctx.beginPath();
                        ctx.strokeStyle = 'red';
                        coordinates.forEach((point, index) => {
                            if (index === 0) {
                                ctx.moveTo(point.x, point.y);
                            } else {
                                ctx.lineTo(point.x, point.y);
                            }
                        });
                        ctx.stroke();
                    }

                    window.addEventListener('resize', resizeCanvas);
                    canvas.addEventListener('mousedown', startDrawing);
                    canvas.addEventListener('mousemove', draw);
                    canvas.addEventListener('mouseup', stopDrawing);
                    canvas.addEventListener('mouseout', stopDrawing);
                    clearBtn.addEventListener('click', clearDrawing);
                    // loadBtn.addEventListener('click', loadDrawing);

                    resizeCanvas();
                }

                function itemContainsText (element, text) {
                    // Check if the current element contains the text
                    if (element.textContent.includes(text)) {
                        return true;
                    }

                    for (let child of element.children) {
                        if (itemContainsText(child, text)) {
                            return true;
                        }
                    }
                    return false;
                }

                $scope.$watch('form.component', function (newValue) {
                    if (newValue) {
                        var formBuilderColumns = document.getElementsByClassName('form-builder-column');
                        for (var i = 0; i < formBuilderColumns.length; i++) {
                            // formBuilderColumns[i].style.background = 'red';
                        }

                        // get the test-table-label whose content is "." and add display: none to its parent
                        var wrapperContents = document.getElementsByClassName('test-table-label');
                        for (var i = 0; i < wrapperContents.length; i++) {
                            if (wrapperContents[i].textContent === ".") {
                                wrapperContents[i].parentElement.style.display = 'none';
                            }
                        }

                        findItemWithText();
                    }
                });

                $scope.$on('$destroy', function () {
                    if ($scope.$parent.consultation && $scope.$parent.consultation.observationForms) {
                        if ($scope.form.component) {
                            var formObservations = $scope.form.component.getValue();
                            $scope.form.observations = formObservations.observations;

                            var hasError = formObservations.errors;
                            if (!_.isEmpty(hasError)) {
                                $scope.form.isValid = false;
                            }
                        }
                    }
                });
            };

            return {
                restrict: 'E',
                scope: {
                    form: "=",
                    patient: "=",
                    validateForm: "="
                },
                controller: controller
            };
        }]);
