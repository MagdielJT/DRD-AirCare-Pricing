/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/currentRecord', 'N/ui/message', 'N/format', 'N/https', 'N/record', 'N/format'],

    function (url, currentRecord, message, format, https, record, format) {
        var recordForm = currentRecord.get();
        var periodo, clase, monedaMxn, monedaUsd, arrIdItemsEnsamblaje = [];

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {
                let currentForm = currentRecord.get();
                var arrBase = currentForm.getValue({ fieldId: "custpage_tkio_arritems" });
                if (arrBase) {
                    arrIdItemsEnsamblaje = (arrBase).split(',');

                } else {
                    arrIdItemsEnsamblaje = [];
                }
                console.log({ arrIdItem: arrIdItemsEnsamblaje });

            } catch (e) {
                console.error(e.message);
            }
        }
        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {
                let currentForm = currentRecord.get();
                if ((scriptContext.fieldId == 'custpage_tkio_periodocontable') || (scriptContext.fieldId == 'custpage_tkio_clase') || (scriptContext.fieldId == "custpage_tkio_cambiodolar") || (scriptContext.fieldId == "custpage_tkio_cambiopeso")) {
                    periodo = currentForm.getValue({ fieldId: "custpage_tkio_periodocontable" });
                    clase = currentForm.getValue({ fieldId: "custpage_tkio_clase" });
                    monedaMxn = currentForm.getValue({ fieldId: "custpage_tkio_cambiodolar" });
                    monedaUsd = currentForm.getValue({ fieldId: "custpage_tkio_cambiopeso" });

                    // let info = infoSystem(scriptContext,)

                }
                if (scriptContext.fieldId === 'sublist_valid_incrementar_mxn') {

                    var idCheck = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_valid_incrementar_mxn', line: scriptContext.line });
                    let idItem = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_id_internal_item_mxn', line: scriptContext.line });
                    if (idCheck) {
                        arrIdItemsEnsamblaje.push(idItem);
                    } else {
                        arrIdItemsEnsamblaje = arrIdItemsEnsamblaje.filter(item => item !== idItem);
                    }
                    console.log({ arrIdItemsEnsamblaje: arrIdItemsEnsamblaje });
                }
            } catch (error) {
                console.error('error on fieldChange', error);
            }

        }
        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            try {
                var sublistName = scriptContext.sublistId();
                var currentForm = currentRecord.get();

            } catch (error) {
                console.log('Error: ', error)
            }
        }
        function formatDates(date) {
            fechaFormat = format.format({
                value: new Date(date),
                type: format.Type.DATE
            });
            return fechaFormat;
        }
        /**
        * Función que permitirá traer el valor de un parametro dentro de la url
        * @param String name
        * @return String
        */
        function getParameterByName(name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }
        /**
         * @summary función que servirá para controlar la acción del boton
         */
        function filtrar() {
            try {
                if (!periodo && !clase && !monedaMxn && !monedaUsd) {
                    periodo = getParameterByName("periodo");
                    clase = getParameterByName("clase");
                    monedaMxn = getParameterByName("monedaMxn");
                    monedaUsd = getParameterByName("monedaUsd");
                }
                if (periodo && clase && monedaMxn && monedaUsd) {
                    var output = url.resolveScript({
                        scriptId: 'customscript_tkio_pricing',
                        deploymentId: 'customdeploy_tkio_pricing',
                        params: {
                            'periodo': periodo,
                            'clase': clase,
                            'monedaMxn': monedaMxn,
                            'monedaUsd': monedaUsd,
                            'action': 'filtrar',
                            'flag': true
                        },
                        returnExternalUrl: false,
                    });
                    window.open(output, '_self');
                } else {
                    var msgbody = message.create({
                        type: message.Type.ERROR,
                        title: "Datos incompletos",
                        message: "Asegurese de llenar todos los campos de la pantalla"
                    });
                    msgbody.show({ duration: 5000 });

                }
            } catch (e) {
                console.error(e);
            }

        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para marcar todas las lineas de los articulos
         */
        function markAll() {
            try {
                var actionVal = getParameterByName("action");
                if (actionVal) {
                    periodo = getParameterByName("periodo");
                    clase = getParameterByName("clase");
                    monedaMxn = getParameterByName("monedaMxn");
                    monedaUsd = getParameterByName("monedaUsd");
                    let flag = getParameterByName("flag");
                    if (periodo && clase && monedaMxn && monedaUsd) {
                        if (flag === "true") {
                            flag = true;
                        } else {
                            flag = false;
                        }
                        var output = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing',
                            deploymentId: 'customdeploy_tkio_pricing',
                            params: {
                                periodo: periodo,
                                clase: clase,
                                monedaMxn: monedaMxn,
                                monedaUsd: monedaUsd,
                                'action': "marcarTodo",
                                'flag': flag
                            },
                            returnExternalUrl: false,
                        });
                        window.open(output, '_self');
                        setTimeout(function () {
                            window.location.reload();
                        }, 2000);
                    }
                } else {
                    var mensajeError = message.create({ type: message.Type.ERROR, title: "Proceso incorrecto.", message: "Asegurese de realizar primero un filtrado." });
                    mensajeError.show({ duration: 5000 });
                }
            } catch (error) {
                console.error(error);
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para desmarcar todas las lineas de los articulos
         */
        function dismarkAll() {
            try {
                var actionVal = getParameterByName("action");
                if (actionVal) {
                    periodo = getParameterByName("periodo");
                    clase = getParameterByName("clase");
                    monedaMxn = getParameterByName("monedaMxn");
                    monedaUsd = getParameterByName("monedaUsd");
                    let flag = getParameterByName("flag");
                    if (periodo && clase && monedaMxn && monedaUsd) {
                        if (flag === "true") {
                            flag = true;
                        } else {
                            flag = false;
                        }
                        var output = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing',
                            deploymentId: 'customdeploy_tkio_pricing',
                            params: {
                                periodo: periodo,
                                clase: clase,
                                monedaMxn: monedaMxn,
                                monedaUsd: monedaUsd,
                                'action': "desMarcarTodo",
                                'flag': flag
                            },
                            returnExternalUrl: false,
                        });
                        window.open(output, '_self');
                        setTimeout(function () {
                            window.location.reload();
                        }, 2000);
                    }
                } else {
                    var mensajeError = message.create({ type: message.Type.ERROR, title: "Proceso incorrecto.", message: "Asegurese de realizar primero un filtrado." });
                    mensajeError.show({ duration: 5000 });
                }
            } catch (error) {
                console.error(error);
            }
        }
        /**
         * @summary función que mandará la información al script de servicio
         */
        function incrementar() {
            try {
                var actionVal = getParameterByName("action");
                if (actionVal) {
                    periodo = getParameterByName("periodo");
                    clase = getParameterByName("clase");
                    monedaMxn = getParameterByName("monedaMxn");
                    monedaUsd = getParameterByName("monedaUsd");
                    if (periodo && clase && monedaMxn && monedaUsd) {
                        var currentForm = currentRecord.get();
                        console.log('currentForm: ', currentForm);
                        console.log(arrIdItemsEnsamblaje.length);
                        var lineCountMxn = currentForm.getLineCount({ sublistId: 'sublist_precios_mxn' });
                        var lineCountUsd = currentForm.getLineCount({ sublistId: 'sublist_precios_usd' });

                        let arregloItems = getDataList("I", lineCountMxn, lineCountUsd, currentForm);
                        console.log(arregloItems);
                        var existeDuplicado = validateArrays(arregloItems);
                        console.log({ title: "Existe duplicado", details: existeDuplicado })// Validación para verificar que se selecciono al menos un articulo.
                        //En cualquiera de las dos tablas
                        if (existeDuplicado) {
                            if (arregloItems[0].length !== 0 || arregloItems[1].length !== 0) {
                                //Objeto Auxiliar con todos los datos a incrementados
                                var bodyAux = {
                                    action: "incrementar",
                                    periodo: periodo,
                                    clase: clase,
                                    monedaMxn: monedaMxn,
                                    monedaUsd: monedaUsd,
                                    body: arregloItems
                                }
                                console.log('arreglo Items - Incrementar: ', JSON.stringify(arregloItems));
                                var mensajeInfo = message.create({ type: message.Type.INFORMATION, title: "Estado de la solicitud en proceso", message: "Se están agendando tus citas." });
                                mensajeInfo.show({ duration: 1500 });
                                //=============================================================
                                //Se Obtiene la direccion del script de Servicio para ejecutar la accion de incrementar
                                var out = url.resolveScript({
                                    scriptId: 'customscript_tkio_pricing_servicio_sl',
                                    deploymentId: 'customdeploy_tkio_pricing_servicio_sl',
                                    returnExternalUrl: false
                                });
                                var response = https.post({ url: out, body: JSON.stringify(bodyAux) });
                                console.log("response: ", response);
                                var respuesta = JSON.parse(response.body);
                                controlMessages(respuesta);
                            } else {
                                var mensajeError = message.create({ type: message.Type.ERROR, title: "No ha seleccionado ningun articulo. ", message: "Debe seleccionar al menos un articulo para hacer un incremento." });
                                mensajeError.show({ duration: 5000 });
                            }
                        }
                    }
                } else {
                    var mensajeError = message.create({ type: message.Type.ERROR, title: "Proceso incorrecto. ", message: "Asegurese de realizar primero un filtrado." });
                    mensajeError.show({ duration: 5000 });
                }
            } catch (e) {
                console.error('Incrementar error: ', e);
            }
        }
        function exportar(user) {
            try {
                console.log('user: ', user);
                periodo = getParameterByName("periodo");
                clase = getParameterByName("clase");
                monedaMxn = getParameterByName("monedaMxn");
                monedaUsd = getParameterByName("monedaUsd");
                if (periodo && clase && monedaMxn && monedaUsd) {
                    var currentForm = currentRecord.get();
                    console.log('currentForm: ', currentForm);
                    console.log(arrIdItemsEnsamblaje.length);
                    var lineCountMxn = currentForm.getLineCount({ sublistId: 'sublist_precios_mxn' });
                    var lineCountUsd = currentForm.getLineCount({ sublistId: 'sublist_precios_usd' });

                    let arregloItems = getDataList("G", lineCountMxn, lineCountUsd, currentForm);
                    console.log('arregloItems: ', arregloItems);
                    // Validación para verificar que se selecciono al menos un articulo.
                    //En cualquiera de las dos tablas
                    if (arregloItems[0].length !== 0 || arregloItems[1].length !== 0) {
                        //Objeto Auxiliar con todos los datos a incrementados
                        var bodyAux = {
                            action: "exportar",
                            periodo: periodo,
                            clase: clase,
                            monedaMxn: monedaMxn,
                            monedaUsd: monedaUsd,
                            body: arregloItems,
                        }
                        console.log(JSON.stringify(arregloItems));
                        var mensajeInfo = message.create({ type: message.Type.INFORMATION, title: "Estado de la solicitud en proceso", message: "Realizando exportación." });
                        mensajeInfo.show({ duration: 1500 });
                        var registro = infoSystem(user, 'Exportar', 'Se han exportado los aumentos realizados en la pantalla de Pricing. ');
                        //=============================================================
                        //Se Obtiene la direccion del script de Servicio para ejecutar la accion de incrementar
                        var out = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing_servicio_sl',
                            deploymentId: 'customdeploy_tkio_pricing_servicio_sl',
                            returnExternalUrl: false
                        });
                        console.log('bodyAux: ', JSON.stringify(bodyAux));
                        var response = https.post({ url: out, body: JSON.stringify(bodyAux) });

                        //Se obtienen los datos y se genera el archivo csv
                        var respuesta = response.body;
                        window.open(respuesta, "_blank")

                        //controlMessages(respuesta);
                        var output = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing',
                            deploymentId: 'customdeploy_tkio_pricing',
                            params: {
                                'periodo': periodo,
                                'clase': clase,
                                'monedaMxn': monedaMxn,
                                'monedaUsd': monedaUsd,
                                'action': 'exportar',
                                'flag': true
                            },
                            returnExternalUrl: false,
                        });
                        window.open(output, '_self');
                    }
                } else {
                    var mensajeError = message.create({ type: message.Type.ERROR, title: "Datos incompletos. ", message: "Asegurese de llenar todos los campos de la pantalla." });
                    mensajeError.show({ duration: 5000 });
                }
            } catch (e) {
                console.error("Error exportar: ", e);
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Valida que no se seleccione en ambas tablas el mismo articulo
         *          
         */
        function validateArrays(arrayItems) {
            try {
                arrayItems[0].forEach(itemMXN => {
                    arrayItems[1].forEach(itemUSD => {
                        if (itemMXN.id === itemUSD.id && itemMXN.check && itemUSD.check) {
                            var mensajeError = message.create({ type: message.Type.ERROR, title: "Articulo doblemente seleccionado. ", message: "Verifique no seleccionar el mismo articulo en ambas tablas." });
                            mensajeError.show({ duration: 5000 });
                            throw "incremento invalido";
                        }
                    });
                });
                return true;
            } catch (error) {
                return false
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para guardar los registros de modificacion y ejecutar el mapreduce
         */
        function guardar(user) {
            try {
                console.log('user: ', user);
                periodo = getParameterByName("periodo");
                clase = getParameterByName("clase");
                monedaMxn = getParameterByName("monedaMxn");
                monedaUsd = getParameterByName("monedaUsd");
                if (periodo && clase && monedaMxn && monedaUsd) {
                    var currentForm = currentRecord.get();
                    console.log('currentForm: ', currentForm);
                    console.log(arrIdItemsEnsamblaje.length);
                    var lineCountMxn = currentForm.getLineCount({ sublistId: 'sublist_precios_mxn' });
                    var lineCountUsd = currentForm.getLineCount({ sublistId: 'sublist_precios_usd' });

                    let arregloItems = getDataList("G", lineCountMxn, lineCountUsd, currentForm);
                    console.log('arregloItems: ', arregloItems);
                    // Validación para verificar que se selecciono al menos un articulo.
                    //En cualquiera de las dos tablas
                    if (arregloItems[0].length !== 0 || arregloItems[1].length !== 0) {
                        //Objeto Auxiliar con todos los datos a incrementados
                        var bodyAux = {
                            action: "guardar",
                            periodo: periodo,
                            clase: clase,
                            monedaMxn: monedaMxn,
                            monedaUsd: monedaUsd,
                            body: arregloItems,
                        }
                        console.log(JSON.stringify(arregloItems));
                        var mensajeInfo = message.create({ type: message.Type.INFORMATION, title: "Estado de la solicitud en proceso", message: "Realizando incremento." });
                        mensajeInfo.show({ duration: 1500 });
                        var registro = infoSystem(user, 'Guardar', 'Se han guardado los aumentos realizados en la pantalla de Pricing. ');
                        //=============================================================
                        //Se Obtiene la direccion del script de Servicio para ejecutar la accion de incrementar
                        var out = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing_servicio_sl',
                            deploymentId: 'customdeploy_tkio_pricing_servicio_sl',
                            returnExternalUrl: false
                        });
                        console.log('bodyAux: ', JSON.stringify(bodyAux));
                        var response = https.post({ url: out, body: JSON.stringify(bodyAux) });
                        console.log("response: ", response);
                        var respuesta = JSON.parse(response.body);
                        controlMessages(respuesta);
                    }
                } else {
                    var mensajeError = message.create({ type: message.Type.ERROR, title: "Datos incompletos. ", message: "Asegurese de llenar todos los campos de la pantalla." });
                    mensajeError.show({ duration: 5000 });
                }
            } catch (e) {
                console.error("Error guardar: ", e);
            }
        }
        /**
         * 
         * @param {*} accion 
         * @summary Función que servirá para registrar las acciones del sistema.
         */
        function infoSystem(user, accion, descripcion) {
            try {
                console.log('holi info system.');
                let guardarInfo = record.create({ type: 'customrecord_tkio_table_pricing', isDinamic: true });
                var date = new Date();
                var hourMexico = format.format({ value: date, type: format.Type.DATETIME, timezone: format.Timezone.AMERICA_MEXICO_CITY });
                var parseDate = format.parse({ value: hourMexico, type: format.Type.DATETIME });

                guardarInfo.setValue({ fieldId: 'custrecord_tkio_date_pricing', value: parseDate });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_def_table_pricing', value: user });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_tipo_table_pricing', value: accion });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_desc_table_pricing', value: descripcion });

                guardarInfo.save();

            } catch (e) {
                log.error({ title: 'infoSystem: ', details: e });
            }
        }
        /**
         * 
         * @param {*} respuesta 
         * @summary{Funcion encargada de mostrar los mensajes en pantalla}
         */
        function controlMessages(respuesta) {
            try {
                switch (respuesta.estado) {
                    case "incrementado":
                        var mensajeExito = message.create({ type: message.Type.CONFIRMATION, title: "Incremento realizado. ", message: "Verifique las tablas." });
                        mensajeExito.show({ duration: 4500 });
                        var output = url.resolveScript({
                            scriptId: 'customscript_tkio_pricing',
                            deploymentId: 'customdeploy_tkio_pricing',
                            params: {
                                'periodo': periodo,
                                'clase': clase,
                                'monedaMxn': monedaMxn,
                                'monedaUsd': monedaUsd,
                                'action': 'incrementar',
                                'flag': false
                            },
                            returnExternalUrl: false,
                        });

                        window.open(output, '_self');
                        break;
                    case "exitoso":
                        var mensajeExito = message.create({ type: message.Type.CONFIRMATION, title: "Artículo modificado correctamente. ", message: "Se ha realizado el aumento al artículo seleccionado." });
                        mensajeExito.show({ duration: 3500 });
                        break;
                    case "error":
                        var mensajeError = message.create({ type: message.Type.ERROR, title: "Artículo modificado con anterioridad. ", message: "Este artículo ya ha sido modificado anteriormente en dicho periodo contable." });
                        mensajeError.show({ duration: 5000 });
                        break;
                    case "error_file":
                        var mensajeError = message.create({ type: message.Type.ERROR, title: "Error al crear archivo auxiliar. ", message: "Contacte con su administrador." });
                        mensajeError.show({ duration: 5000 });
                        break;
                    case "fallo":
                        var mensajeError = message.create({ type: message.Type.ERROR, title: "Fallo en el Script. ", message: "Contacte a su administrador para más información. " });
                        mensajeError.show({ duration: 5000 });
                        break;
                    case "incremento_invalido":
                        var mensajeError = message.create({ type: message.Type.ERROR, title: "Incremento no válido. ", message: "El incremento introducido no es correcto, tiene que ser un número positivo " });
                        mensajeError.show({ duration: 5000 });
                        break;
                    default:
                        var mensajeInfo = message.create({
                            type: message.Type.ERROR, title: "Ningún artículo seleccionado.", message: "Asegurese de seleccionar al menos un artículo."
                        });
                        mensajeInfo.show({ duration: 5000 });
                        break;
                }
            } catch (error) {
                console.error("Error controlMessages: ", error);
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para obtener todas las lineas de ambas tablas
         */
        function getDataList(filtrado, lcMnx, lcUsd, currentForm) {
            try {
                var arregloItemsMXN = [];
                var arregloItemsUSD = [];
                for (var i = 0; i < lcMnx; i++) {
                    var check = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_valid_incrementar_mxn', line: i });
                    var id = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_id_internal_item_mxn', line: i });
                    var itemCode = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_id_item_mxn', line: i });
                    var listPrice = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_list_price_mxn', line: i }).replace('$', '');
                    var listPriceOr = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_list_price_or_mxn', line: i });
                    var pieces = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_pieces_mxn', line: i });
                    var lastCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_last_cost_mxn', line: i }).replace('$', '');
                    var saleCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_sale_price_mxn', line: i }).replace('$', '');
                    var averageCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_average_cost_mxn', line: i }).replace('$', '');
                    var theoretical_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_theoretical_margin_mxn', line: i });
                    var real_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_real_margin_mxn', line: i });
                    var min_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_minimum_margin_mxn', line: i });
                    var max_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_maximum_margin_mxn', line: i });
                    var currencyItem = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_currency_mxn', line: i });
                    var inc_suggest = "";
                    if (filtrado === "G") {
                        inc_suggest = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_suggested_increase_or_mxn', line: i });
                    } else {
                        inc_suggest = currentForm.getSublistValue({ sublistId: 'sublist_precios_mxn', fieldId: 'sublist_suggested_increase_mxn', line: i });
                    }

                    if (filtrado === "G") {
                        arregloItemsMXN.push({
                            check: check,
                            id: id,
                            itemCode: itemCode,
                            listPrice: Number(listPrice).toFixed(3),
                            listPriceOr: Number(listPriceOr).toFixed(3),
                            pieces: pieces,
                            lastCost: Number(lastCost).toFixed(3),
                            saleCost: Number(saleCost).toFixed(3),
                            averageCost: Number(averageCost).toFixed(3),
                            theoretical_margin: Number(theoretical_margin).toFixed(3),
                            real_margin: Number(real_margin).toFixed(3),
                            min_margin: Number(min_margin).toFixed(3),
                            max_margin: Number(max_margin).toFixed(3),
                            inc_suggest: Number(inc_suggest).toFixed(3),
                            currencyItem: currencyItem
                        });
                    } else {

                        if (check) {
                            arregloItemsMXN.push({
                                check: check,
                                id: id,
                                itemCode: itemCode,
                                listPrice:Number( parseFloat(listPrice) + (parseFloat(listPriceOr) * parseFloat(inc_suggest)) / 100).toFixed(3),
                                listPriceOr: Number(listPriceOr).toFixed(3),
                                pieces: pieces,
                                lastCost: Number(lastCost).toFixed(3),
                                saleCost: Number(saleCost).toFixed(3),
                                averageCost: Number(averageCost).toFixed(3),
                                theoretical_margin: Number(theoretical_margin).toFixed(3),
                                real_margin: Number(real_margin).toFixed(3),
                                min_margin: Number(min_margin).toFixed(3),
                                max_margin: Number(max_margin).toFixed(3),
                                inc_suggest: Number(inc_suggest).toFixed(3),
                                currencyItem: currencyItem
                            });
                        }

                    }
                }
                console.log('lcUsd: ', lcUsd);
                for (var i = 0; i < lcUsd; i++) {
                    var check = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_valid_incrementar_usd', line: i });
                    var id = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_id_internal_item_usd', line: i });
                    var itemCode = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_id_item_usd', line: i });
                    var listPrice = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_list_price_usd', line: i }).replace('$', '');
                    var listPriceOr = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_list_price_or_usd', line: i });
                    var pieces = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_pieces_usd', line: i });
                    var lastCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_last_cost_usd', line: i }).replace('$', '');
                    var saleCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_sale_price_usd', line: i }).replace('$', '');
                    var averageCost = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_average_cost_usd', line: i }).replace('$', '');
                    var theoretical_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_theoretical_margin_usd', line: i });
                    var real_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_real_margin_usd', line: i });
                    var min_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_minimum_margin_usd', line: i });
                    var max_margin = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_maximum_margin_usd', line: i });
                    var currencyItem = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_currency_usd', line: i });
                    var inc_suggest = ""
                    if (filtrado === "G") {
                        inc_suggest = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_suggested_increase_or_usd', line: i });
                    } else {
                        inc_suggest = currentForm.getSublistValue({ sublistId: 'sublist_precios_usd', fieldId: 'sublist_suggested_increase_usd', line: i });
                    }
                    if (filtrado === "G") {
                        arregloItemsUSD.push({
                            check: check,
                            id: id,
                            itemCode: itemCode,
                            listPrice: Number(listPrice).toFixed(3),
                            listPriceOr: Number(listPriceOr).toFixed(3),
                            pieces: pieces,
                            lastCost: Number(lastCost).toFixed(3),
                            saleCost: Number(saleCost).toFixed(3),
                            averageCost: Number(averageCost).toFixed(3),
                            theoretical_margin: Number(theoretical_margin).toFixed(3),
                            real_margin: Number(real_margin).toFixed(3),
                            min_margin: Number(min_margin).toFixed(3),
                            max_margin: Number(max_margin).toFixed(3),
                            inc_suggest: Number(inc_suggest).toFixed(3),
                            currencyItem: currencyItem
                        });
                    } else {

                        if (check) {

                            arregloItemsUSD.push({
                                check: check,
                                id: id,
                                itemCode: itemCode,
                                listPrice: Number(parseFloat(listPrice) + (parseFloat(listPriceOr) * parseFloat(inc_suggest)) / 100).toFixed(3),
                                listPriceOr: Number(listPriceOr).toFixed(3),
                                pieces: pieces,
                                lastCost: Number(lastCost).toFixed(3),
                                saleCost: Number(saleCost).toFixed(3),
                                averageCost: Number(averageCost).toFixed(3),
                                theoretical_margin: Number(theoretical_margin).toFixed(3),
                                real_margin: Number(real_margin).toFixed(3),
                                min_margin: Number(min_margin).toFixed(3),
                                max_margin: Number(max_margin).toFixed(3),
                                inc_suggest: Number(inc_suggest).toFixed(3),
                                currencyItem: currencyItem,
                            });
                        }

                    }
                }
                console.log('arregloItemsUSD, ', JSON.stringify(arregloItemsUSD))
                return [arregloItemsMXN, arregloItemsUSD]
            } catch (error) {

            }
        }
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            dismarkAll: dismarkAll,
            markAll: markAll,
            filtrar: filtrar,
            incrementar: incrementar,
            guardar: guardar,
            exportar: exportar
        };

    }

);
