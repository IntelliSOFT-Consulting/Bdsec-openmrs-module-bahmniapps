"use strict";

angular.module("bahmni.common.conceptSet").directive("formControls", [
    "formService",
    "spinner",
    "$timeout",
    "$translate",
    function (formService, spinner, $timeout, $translate) {
        const loadedFormDetails = {};
        const loadedFormTranslations = {};

        const unMountReactContainer = (formUuid) => {
            const reactContainerElement = angular.element(document.getElementById(formUuid));
            reactContainerElement.on("$destroy", () => unMountForm(document.getElementById(formUuid)));
        };

        const controller = ($scope) => {
            const { formUuid, formVersion, formName, observations: formObservations, collapseInnerSections: { value: collapse } = {} } = $scope.form;

            const locale = $translate.use();
            const validateForm = $scope.validateForm || false;

            const loadFormDetails = () => {
                return spinner
          .forPromise(
            formService.getFormDetail(formUuid, { v: "custom:(resources:(value))" }).then((response) => {
                const formDetailsAsString = _.get(response, "data.resources[0].value");
                if (formDetailsAsString) {
                    const formDetails = JSON.parse(formDetailsAsString);
                    formDetails.version = formVersion;
                    loadedFormDetails[formUuid] = formDetails;

                    const formParams = { formName, formVersion, locale, formUuid };
                    $scope.form.events = formDetails.events;

                    return spinner
                  .forPromise(
                    formService
                      .getFormTranslations(formDetails.translationsUrl, formParams)
                      .then((res) => res.data[0] || {})
                      .catch(() => ({}))
                  )
                  .then((formTranslations) => {
                      loadedFormTranslations[formUuid] = formTranslations;
                      $scope.form.component = renderWithControls(
                      formDetails,
                      formObservations,
                      formUuid,
                      collapse,
                      $scope.patient,
                      validateForm,
                      locale,
                      formTranslations
                    );
                  });
                }
            })
          )
          .finally(() => unMountReactContainer(formUuid));
            };

            const setupFormComponent = () => {
                const formDetails = loadedFormDetails[formUuid];
                const formTranslations = loadedFormTranslations[formUuid];
                $scope.form.events = formDetails.events;
                $scope.form.component = renderWithControls(
          formDetails,
          formObservations,
          formUuid,
          collapse,
          $scope.patient,
          validateForm,
          locale,
          formTranslations
        );
                unMountReactContainer(formUuid);
            };

            const initializeForm = () => {
                if (!loadedFormDetails[formUuid]) {
                    loadFormDetails();
                } else {
                    $timeout(setupFormComponent, 0, false);
                }
            };

            const handleCollapseChange = () => {
                if (loadedFormDetails[formUuid]) {
                    setupFormComponent();
                }
            };

            const setupDrawingTools = (canvasId, clearBtnId) => {
                const canvas = document.getElementById(canvasId);
                const ctx = canvas.getContext("2d");
                let isDrawing = false;
                let coordinates = [];

                const resizeCanvas = () => {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                };

                const startDrawing = (e) => {
                    isDrawing = true;
                    draw(e);
                };

                const stopDrawing = () => {
                    isDrawing = false;
                    ctx.beginPath();
                    updateObsControlField();
                };

                const draw = (e) => {
                    if (!isDrawing) return;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    ctx.lineWidth = 2;
                    ctx.lineCap = "round";
                    ctx.strokeStyle = "red";

                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x, y);

                    coordinates.push({ x, y });
                };

                const clearDrawing = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    coordinates = [];
                    updateObsControlField();
                };

                const updateObsControlField = () => {
                    if (obsControlField) {
                        const textArea = obsControlField.querySelector("textarea");
                        textArea.value = JSON.stringify(coordinates);
                    }
                };

                canvas.addEventListener("mousedown", startDrawing);
                canvas.addEventListener("mousemove", draw);
                canvas.addEventListener("mouseup", stopDrawing);
                canvas.addEventListener("mouseout", stopDrawing);

                document.getElementById(clearBtnId).addEventListener("click", clearDrawing);

                resizeCanvas();
                window.addEventListener("resize", resizeCanvas);
            };

            const findAndSetupDrawings = () => {
                const items = document.querySelectorAll(".form-field-wrap");
                const drawingData = [
          { text: "Eye to be Operated Co-ordinates", imageSrc: "/bahmni/images/eye.png" },
          { text: "Fundus Exam Drawing, Left Eye", imageSrc: "/bahmni/images/fundus-left.png" },
          { text: "Fundus Exam Drawing, Right Eye", imageSrc: "/bahmni/images/fundus-right.png" }
                ];

                items.forEach((item, index) => {
                    drawingData.forEach(({ text, imageSrc }, dataIndex) => {
                        if (itemContainsText(item, text)) {
                            const canvasId = `drawing-area-${index}-${dataIndex}`;
                            const clearBtnId = `clear-btn-${index}-${dataIndex}`;
                            const eyeContainer = createDrawingContainer(imageSrc, canvasId, clearBtnId);
                            item.appendChild(eyeContainer);
                            setupDrawingTools(canvasId, clearBtnId);

                            const obsControlField = item.querySelector(".obs-control-field");
                            if (obsControlField) obsControlField.style.display = "none";
                            item.classList.add("eye-container-class");
                        }
                    });
                });
            };

            const createDrawingContainer = (imageSrc, canvasId, clearBtnId) => {
                const eyeContainer = document.createElement("div");
                eyeContainer.className = "eye-container-class";

                const eye = document.createElement("img");
                eye.className = "eye-class";
                eye.src = imageSrc;

                const drawingArea = document.createElement("canvas");
                drawingArea.id = canvasId;
                drawingArea.className = "drawing-area-class";

                const clearBtn = document.createElement("button");
                clearBtn.id = clearBtnId;
                clearBtn.className = "clear-btn-class";
                clearBtn.textContent = "Clear";

                eyeContainer.append(eye, drawingArea, clearBtn);
                return eyeContainer;
            };

            const itemContainsText = (element, text) => {
                if (element.textContent.includes(text)) return true;
                return [...element.children].some((child) => itemContainsText(child, text));
            };

            $scope.$watch("form.collapseInnerSections", handleCollapseChange);

            $scope.$watch("form.component", (newValue) => {
                if (newValue) {
                    findAndSetupDrawings();
                }
            });

            $scope.$on("$destroy", () => {
                const { consultation } = $scope.$parent;
                if (consultation && consultation.observationForms && $scope.form.component) {
                    const formObservations = $scope.form.component.getValue();
                    $scope.form.observations = formObservations.observations;
                    $scope.form.isValid = _.isEmpty(formObservations.errors);
                }
            });

            initializeForm();
        };

        return {
            restrict: "E",
            scope: {
                form: "=",
                patient: "=",
                validateForm: "="
            },
            controller: controller
        };
    }
]);
