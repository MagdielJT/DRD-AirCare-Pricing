/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/redirect', 'N/log', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/https', 'N/record', 'N/config', 'N/format', 'N/runtime', 'N/email', 'N/task', 'N/file'],
    /**
 * @param{currentRecord} currentRecord
 * @param{log} log
 * @param{record} record
 */
    (redirect, log, search, serverWidget, url, https, record, config, format, runtime, email, task, file) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        var jsonMod = { arr: [] }
        let json = [];
        var estado = "";
        var arreglos = {}
        const onRequest = (scriptContext) => {
            try {
                //=======================Receive data=======================
                var data = scriptContext.request.body;
                data = JSON.parse(data);
                log.audit({
                    title: 'Data',
                    details: data
                })
                var action = data.action;
                arreglos = {
                    monedaMxn: data.monedaMxn,
                    monedaUsd: data.monedaUsd,
                    arrmxn: data.body[0],
                    arrusd: data.body[1]
                };

                switch (action) {
                    case "incrementar":
                        validateColumns("I", data.periodo, data.clase, data.monedaMxn, data.monedaUsd);
                        if (estado === "exitoso") {
                            createFileObj(arreglos);
                        }
                        var response = scriptContext.response;
                        response.write({
                            output: JSON.stringify({ estado: estado })
                        });
                        break;
                    case "guardar":
                        validateColumns("G", data.periodo, data.clase, data.monedaMxn, data.monedaUsd);
                        if (estado === "exitoso") {
                            modiRegisters();
                        }
                        var response = scriptContext.response;
                        response.write({
                            output: JSON.stringify({ estado: estado })
                        });
                        break;
                    case "exportar":
                        log.audit({ title: 'arreglos', details: data.body[0] });
                        let dataMXN = data.body[0];
                        let dataUSD = data.body[1];
                        log.audit({ title: 'arreglos', details: data.body[0].length });
                        let datos = [];
                        for (let i = 0; i < dataMXN.length; i++) {
                            var obj = {
                                "Codigo Art.": dataMXN[i].itemCode,
                                "Precio Lista": dataMXN[i].listPrice,
                                "Piezas": dataMXN[i].pieces,
                                "Ultimo Costo": dataMXN[i].lastCost,
                                "Precio Venta": dataMXN[i].saleCost,
                                "Costo Promedio": dataMXN[i].averageCost,
                                "Margen Teorico": dataMXN[i].theoretical_margin,
                                "Margen Real": dataMXN[i].real_margin,
                                "Margen Minimo": dataMXN[i].min_margin,
                                "Margen Maximo": dataMXN[i].max_margin,
                                "Incremento Sugerido": dataMXN[i].inc_suggest
                            };
                            datos.push(obj);
                        }
                        for (let i = 0; i < dataUSD.length; i++) {
                            var obj = {
                                "Codigo Art.": dataUSD[i].itemCode,
                                "Precio Lista": dataUSD[i].listPrice,
                                "Piezas": dataUSD[i].pieces,
                                "Ultimo Costo": dataUSD[i].lastCost,
                                "Precio Venta": dataUSD[i].saleCost,
                                "Costo Promedio": dataUSD[i].averageCost,
                                "Margen Teorico": dataUSD[i].theoretical_margin,
                                "Margen Real": dataUSD[i].real_margin,
                                "Margen Minimo": dataUSD[i].min_margin,
                                "Margen Maximo": dataUSD[i].max_margin,
                                "Incremento Sugerido": dataUSD[i].inc_suggest
                            };
                            datos.push(obj);
                        }
                        log.audit({ title: 'datos', details: datos });
                        var id = generateExcel(JSON.stringify(datos));
                        var type = 'text/plain';
                        if (type && id) {
                            let fileObj = file.load({ id: id });
                            let headerType = '';

                            switch (type) {
                                case 'pdf':
                                    headerType = 'application/pdf';
                                    break;
                                case 'xml':
                                    headerType = 'text/plain';
                                    break;
                                default:
                                    headerType = 'text/plain';
                                    break;
                            }

                            var response = scriptContext.response;
                            response.setHeader({
                                name: 'Content-Type',
                                value: headerType
                            });

                            response.addHeader({
                                name: "Content-Disposition",
                                value: 'attachment; filename=' + fileObj.name
                            });
                            log.audit({ title: 'fileObj', details: fileObj.url });
                            response.write({
                                output: fileObj.url
                            });
                        }
                        break;
                }
            } catch (e) {
                log.error({ title: 'error onRequest: ', details: e });
                estado = "fallo"
                var response = scriptContext.response;
                response.write({
                    output: JSON.stringify({ estado: estado })
                });
            }
        }

        function generateExcel(dataRol) {
            try {
                var json = JSON.parse(dataRol);
                var fields = Object.keys(json[0]);
                var replacer = function (key, value) {
                    return value === null ? '' : value
                };
                var csv = json.map(function (row) {
                    return fields.map(function (fieldName) {
                        return JSON.stringify(row[fieldName], replacer)
                    }).join(',')
                });
                csv.unshift(fields.join(','));
                csv = csv.join('\r\n');
                var fileObj = file.create({
                    name: 'Precios.csv',
                    fileType: file.Type.CSV,
                    encoding: file.Encoding.WINDOWS_1252,
                    contents: csv
                });
                fileObj.folder = 2660;
                var fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error('Error on generateExcel', e);
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para validar las columnas que no hayan estado registrados y si llegase a haber un incremento sugerido incorrecto
         */
        function validateColumns(filtrado, periodo, clase, monedaMxn, monedaUsd) {
            let arrayItems = recordPricing(periodo, clase);
            let dataMxn = arreglos.arrmxn;
            let dataUsd = arreglos.arrusd;
            for (var i = 0; i < arrayItems.length; i++) {
                dataMxn = dataMxn.filter(item => item.id !== arrayItems[i]);
                dataUsd = dataUsd.filter(item => item.id !== arrayItems[i]);
            }
            log.debug({ title: 'DataMxn', details: dataMxn });
            log.debug({ title: 'DataUsd', details: dataUsd });
            if (dataMxn.length !== 0 || dataUsd.length !== 0) {
                try {
                    let datosGuardar = [];
                    dataMxn.map(data => {
                        let inc_suggest = Number(data.inc_suggest);
                        // if (inc_suggest < 0) {
                        //     throw "incremento invalido";
                        // }
                        data.currencyItem = "1"
                        datosGuardar.push(data)
                    });
                    dataUsd.map(data => {
                        let inc_suggest = Number(data.inc_suggest);
                        // if (inc_suggest < 0) {
                        //     throw "incremento invalido";
                        // }
                        data.currencyItem = "2"
                        datosGuardar.push(data)
                    });
                    var validateCreateRegister = true;
                    if (filtrado === "G") {
                        validateCreateRegister = createRegister(datosGuardar, clase, periodo, monedaMxn, monedaUsd);
                    }

                    estado = (validateCreateRegister ? "exitoso" : "error_createRegister");
                } catch (e) {
                    log.audit({ title: "Error validateColumns: ", "details": e })
                    estado = "incremento_invalido";
                }
            }
            else {
                estado = "error";//Este articulo ya ha sido modificado en dicho periodo contable y con la misma clase.
            }
            // if (data.length !== 0) {
            //     try {
            //         /*Object.keys(data).forEach(item => {
            //             let idItem = data[item].id;
            //             let nombreItem = data[item].itemCode;
            //             let pieces = data[item].pieces;
            //             let lastCost = data[item].lastCost;
            //             let averageCost = data[item].averageCost;
            //             let min_margin = format.parse({ value: data[item].min_margin, type: format.Type.PERCENT });
            //             let max_margin = format.parse({ value: data[item].max_margin, type: format.Type.PERCENT });
            //             let real_margin = format.parse({ value: data[item].real_margin, type: format.Type.PERCENT });
            //             let theoretical_margin = format.parse({ value: data[item].theoretical_margin, type: format.Type.PERCENT });
            //             let inc_suggest = Number(data[item].inc_suggest);
            //             let moneda = Number(data[item].currencyItem);
            //             if (inc_suggest < 0) throw "incremento invalido";
            //             // let listPrice = inc_suggest >= 0 ? data[item].listPrice * (inc_suggest / 100) : data[item].listPrice;//Precio a actualizar
            //             let listPrice = data[item].listPrice;
            //             let saleCost = data[item].saleCost;
            //             json.push({
            //                 id: '',
            //                 idItem: idItem,
            //                 periodo: periodo,
            //                 clase: clase,
            //                 listPrice: listPrice,
            //                 moneda: moneda
            //             })
            //             estado = "exitoso";
            //             jsonMod.arr = json;
            //         })*/
            //     } catch (e) {
            //         log.audit({ title: "Error validateColumns: ", "details": e })
            //         estado = "incremento_invalido";
            //     }
            // }
            // else {
            //     estado = "error";//Este articulo ya ha sido modificado en dicho periodo contable y con la misma clase.
            // }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion generar los registros del cambio de precio por periodo y clase
         */
        function createRegister(data, clase, periodo, monedaMxn, monedaUsd) {
            try {
                log.audit({ title: "Data for Create", details: data })
                log.audit({
                    title: "Criterios: ", details: {
                        periodo: periodo,
                        clase: clase,
                        monedaMxn: monedaMxn,
                        monedaUsd: monedaUsd
                    }
                })
                Object.keys(data).forEach(item => {
                    let idItem = data[item].id;
                    let nombreItem = data[item].itemCode;
                    let pieces = data[item].pieces;
                    let lastCost = data[item].lastCost;
                    let averageCost = data[item].averageCost;
                    let min_margin = format.parse({ value: data[item].min_margin, type: format.Type.PERCENT });
                    let max_margin = format.parse({ value: data[item].max_margin, type: format.Type.PERCENT });
                    let real_margin = format.parse({ value: data[item].real_margin, type: format.Type.PERCENT });
                    let theoretical_margin = format.parse({ value: data[item].theoretical_margin, type: format.Type.PERCENT });
                    let inc_suggest = Number(data[item].inc_suggest);
                    let moneda = Number(data[item].currencyItem);
                    // if (inc_suggest < 0) throw "incremento invalido";
                    // let listPrice = inc_suggest >= 0 ? data[item].listPrice * (inc_suggest / 100) : data[item].listPrice;//Precio a actualizar
                    let listPrice = data[item].listPrice;
                    let saleCost = data[item].saleCost;
                    let guardarItems = record.create({
                        type: 'customrecord_tkio_pricing',
                        isDinamic: true
                    });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_item_code', value: Number(idItem) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_pieces', value: Number(pieces) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_list_price', value: Number(listPrice) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_last_cost', value: Number(lastCost) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_sale_price', value: Number(saleCost) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_average_cost', value: Number(averageCost) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_theoretical_margin', value: theoretical_margin });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_real_margin', value: real_margin });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_minimum_margin', value: min_margin });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_maximum_margin', value: max_margin });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_suggested_increase', value: inc_suggest });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_accounting_period', value: Number(periodo) });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_clase_item', value: clase });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_cambio_peso', value: monedaMxn });
                    guardarItems.setValue({ fieldId: 'custrecord_tkio_cambio_dolar', value: monedaUsd });

                    var id = guardarItems.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                })
                return true;
            } catch (error) {
                log.audit({ title: "Error createRegister: ", details: error });
                return false;
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para ejecutar el mapreduce
         */
        function modiRegisters() {
            try {
                log.debug({ title: 'arreglos modiRegisters', details: JSON.stringify(arreglos) });
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_tkio_pricing_mr',
                    deploymentId: 'customdeploy_tkio_pricing_mr',
                    params: {
                        'custscript_tkio_json_mod': JSON.stringify(arreglos)
                    }
                });
                var idTask = mrTask.submit();
                log.audit({ title: 'idTask', details: idTask });
            } catch (error) {
                log.error({ title: 'Error saveRegisters: ', details: error });
            }
        }
        /**
         * 
         * @param {*}  
         * @summary Funcion para crear un archivo auxiliar para la manipulacion de los articulos ya incrementados
         */
        function createFileObj(arreglos) {
            try {
                var fileObj = file.create({
                    name: 'precios_JSON.txt',
                    fileType: file.Type.PLAINTEXT,
                    contents: JSON.stringify(arreglos),
                    encoding: file.Encoding.UTF8,
                    folder: 2660,
                    isOnline: true
                });
                var fileId = fileObj.save();
                estado = "incrementado"
            } catch (error) {
                log.audit({ title: 'Error createFileObj: ', details: error });
                estado = "error_file"
            }
        }
        /**
         * @param periodo
         * @param clase
         * @return flagExistencia
         * @summary Función que servirá para verificar la existencia de un artículo en el mismo perioso y de la misma clase
         */
        function recordPricing(periodo, clase) {
            var customrecord_tkio_pricingSearchObj = search.create({
                type: "customrecord_tkio_pricing",
                filters: [
                    ["custrecord_tkio_clase_item", "anyof", clase],
                    "AND",
                    ["custrecord_tkio_accounting_period", "anyof", periodo]
                ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_tkio_clase_item", label: "Clase" }),
                        search.createColumn({ name: "custrecord_tkio_item_code", sort: search.Sort.ASC, label: "Código Articulo" }),
                        search.createColumn({ name: "custrecord_tkio_accounting_period", label: "Periodo contable" })
                    ]
            });
            var searchResultCount = customrecord_tkio_pricingSearchObj.runPaged().count;
            // log.debug("customrecord_tkio_pricingSearchObj result count", searchResultCount);
            var arrItems = new Array();

            customrecord_tkio_pricingSearchObj.run().each(function (result) {
                articulo = result.getValue({ name: "custrecord_tkio_item_code" })
                period = result.getValue({ name: 'custrecord_tkio_accounting_period' });
                arrItems.push(articulo);
                return true;
            });
            // log.debug({title: 'arrItems', details: arrItems});
            return arrItems;
        }

        return { onRequest }

    });
