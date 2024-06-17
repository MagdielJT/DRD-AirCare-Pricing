/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
 * @name tkio_pricing_sl
 * @version 1.0
 * @author Ricardo López <ricardo.lopez@freebug.mx>
 * @summary Suitelet 
 * @copyright Tekiio México 2022
 * 
 * Last modification   -> 13/12/2022
 * Modified by         -> Ricardo López <ricardo.lopez@freebug.mx>
 * Script in NS        -> Registro en Netsuite <ID del registro>
 */
define(['N/log', 'N/search', 'N/ui/serverWidget', 'N/ui/message', 'N/file', 'N/config', 'N/record', 'N/runtime', './moment.min', 'N/format', 'N/url'],
    /**
     * @param{log} log
     * @param{search} search
     * @param{serverWidget} serverWidget
    */
    (log, search, serverWidget, message, file, config, record, runtime, moment, format, url) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
        */
        var params = null;
        let itemsList = [[], []];
        let itemsFiltrar = [];
        var arrID = '';
        var unitsValue = {};
        const onRequest = (scriptContext) => {
            try {
                var user = runtime.getCurrentUser().name;
                var parameters = scriptContext.request.parameters;
                params = scriptContext.request.parameters;
                var form = creaPanel(scriptContext, params);
                switch (params.action) {
                    case "filtrar":
                        unitsValue = getUnitsValue();
                        itemsList = searchItems(params);
                        log.audit({ title: 'itemsList', details: itemsList });
                        addItemsList(form, itemsList[0], itemsList[1]);
                        createFileObj(itemsFiltrar);
                        let info = infoSystem('filtrar', 'Se ha realizado una acción de filtrar en la pantalla de precios, en el periodo ' + params.periodo + ' con la clase ' + params.clase);
                        break;
                    case "marcarTodo":
                        if (params.periodo !== '' && params.clase !== '' && params.monedaUsd !== '' && params.monedaMxn !== '') {
                            log.debug({ title: 'params.flag', details: typeof params.flag });
                            if (params.flag === "true") {
                                getDataForFile(38449);
                            } else if (params.flag === "false") {
                                getDataForFile(38455);
                                form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });
                            }
                            addItemsList(form, itemsList[0], itemsList[1]);
                            markAll(form, itemsList[0], itemsList[1], 'T');
                            var arrItems = form.addField({ id: "custpage_tkio_arritems", type: serverWidget.FieldType.TEXT, label: "Arreglo de id" });
                            arrItems.defaultValue = arrID;
                            arrItems.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                            let info = infoSystem('marcar Todo', 'Se ha realizado una acción de marcar todos los artículos de la lista, dentro de la pantalla de precios.');
                        }
                        break;
                    case "desMarcarTodo":
                        if (params.periodo !== '' && params.clase !== '' && params.monedaUsd !== '' && params.monedaMxn !== '') {
                            if (params.flag === "true") {
                                getDataForFile(38449);
                            } else if (params.flag === "false") {
                                getDataForFile(38455);
                                form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });
                            }
                            addItemsList(form, itemsList[0], itemsList[1]);
                            markAll(form, itemsList[0], itemsList[1], 'F');
                            let info = infoSystem('Desmarcar Todo', 'Se ha realizado una acción de desmarcar todos los artículos de la lista, dentro de la pantalla de precios.');
                            var arrItems = form.addField({ id: "custpage_tkio_arritems", type: serverWidget.FieldType.TEXT, label: "Arreglo de id" });
                            arrItems.defaultValue = '';
                            arrItems.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                        }
                        break;
                    case "incrementar":
                        getDataForFile(38455);
                        addItemsList(form, itemsList[0], itemsList[1]);
                        form.addButton({ id: "custpage_tkio_exportar", label: "Exportar", functionName: 'exportar("' + user + '")' });
                        let informacion = infoSystem('Incrementar', 'Se ha realizado una acción de Incrementar artículos de la lista, dentro de la pantalla de precios.');
                        break;
                    case "exportar":
                        log.audit({ title: 'Exportar', details: "Bandera" });
                        getDataForFile(38455);
                        addItemsList(form, itemsList[0], itemsList[1]);
                        form.addButton({ id: "custpage_tkio_exportar", label: "Exportar a Excel", functionName: 'exportar("' + user + '")' });
                        form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });

                        let information = infoSystem('Incrementar', 'Se ha realizado una acción de Incrementar artículos de la lista, dentro de la pantalla de precios.');
                        break;
                }

                scriptContext.response.writePage({ pageObject: form });
            } catch (e) {
                log.error({ title: "error onRequest", details: e });
                var formerror = errForm(e);
                scriptContext.response.writePage({
                    pageObject: formerror
                })
            }
        }

        /**
         * 
         * @param {*} arreglos 
         * @summary {Función Obtiene las unidades para realizar las conversiones necesarias}
         */
        function getUnitsValue() {
            try {

                var unitstypeSearchObj = search.create({
                    type: "unitstype",
                    filters: [],
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "conversionrate", label: "Rate" }),
                            search.createColumn({ name: "pluralabbreviation", label: "Abbreviation Name(Plural)" }),
                            search.createColumn({ name: "abbreviation", label: "Abbreviation Name" }),
                            search.createColumn({ name: "unitname", label: "Unit Name" }),
                            search.createColumn({ name: "baseunit", label: "Is Base Unit" }),
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                });
                var searchResultCount = unitstypeSearchObj.runPaged().count;
                log.debug("unitstypeSearchObj result count", searchResultCount);
                let objAux = {};
                unitstypeSearchObj.run().each(function (result) {
                    let objPib = {
                        unitGeneral: result.getValue({ name: 'name' }),
                        unitName: result.getValue({ name: 'pluralabbreviation' }),
                        unitNameAbr: result.getValue({ name: 'abbreviation' }),
                        unitValue: result.getValue({ name: 'conversionrate' }),
                        unitBase: result.getValue({ name: 'baseunit' }),
                        internalid: result.getValue({ name: 'internalid' }),
                    };
                    if (objAux[objPib.unitGeneral]) {
                        objAux[objPib.unitGeneral][objPib.unitName] = {
                            value: parseFloat(objPib.unitValue),
                            unitNameAbr: objPib.unitNameAbr,
                            unitBase: objPib.unitBase
                        }
                    } else {
                        objAux[objPib.unitGeneral] = {
                            [objPib.unitName]: {
                                value: parseFloat(objPib.unitValue),
                                unitNameAbr: objPib.unitNameAbr,
                                unitBase: objPib.unitBase
                            }
                        }
                    }
                    return true;
                });
                let objMaster = {};
                // Objeto principal del cual se recorren sus respectivos objetos hijos ya agrupados
                for (key in objAux) {
                    // Objeto que se genera y vacia con cada iteracion del principal este objeto tendra la unidad base

                    var objAux2 = objAux[key];
                    // Obteniendo la unidad base dentro del sistema
                    var objPib = {};
                    // Agrupando aquellos que no tengan el check de verdadero
                    let arrMaster = [];
                    for (key2 in objAux2) {
                        if (objAux2[key2].unitBase) {
                            objPib = { clave: [key2], valores: objAux2[key2] };
                        } else {
                            arrMaster.push({ clave: [key2], valores: objAux2[key2] })
                        }
                    }
                    if (arrMaster.length > 0) {
                        arrMaster.forEach(unit => {
                            objMaster[unit.clave] = {
                                [objPib.clave]: objPib.valores,
                                [unit.clave]: unit.valores
                            }
                            objMaster[objPib.clave] = {
                                [objPib.clave]: objPib.valores,
                                [unit.clave]: unit.valores
                            }
                        })
                    }
                    else {
                        objMaster[objPib.clave] = {
                            [objPib.clave]: objPib.valores,
                        }
                    }
                    arrMaster = [];
                    objPib = {};
                }
                //objAux = objMaster;
                log.audit({ title: 'objAux', details: objAux });
                log.audit({ title: 'Count key', details: Object.keys(objAux).length });
                return objAux;
            } catch (e) {
                log.error({ title: 'Error getUnitsValue:', details: e });
                return {}
            }
        }
        /**
         * 
         * @param {*} arreglos 
         * @summary {Función que servirá para crear un archivo TXT}
         */
        function createFileObj(arreglos) {
            try {
                var arreglo = { arrmxn: arreglos[0], arrusd: arreglos[1] }
                var fileObj = file.create({
                    name: 'precios_filtrar_JSON.txt',
                    fileType: file.Type.PLAINTEXT,
                    contents: JSON.stringify(arreglo),
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
         * 
         * @param {*} accion 
         * @summary Función que servirá para registrar las acciones del sistema.
         */
        function infoSystem(accion, descripcion) {
            try {

                let guardarInfo = record.create({
                    type: 'customrecord_tkio_table_pricing',
                    isDinamic: true
                });
                var user = runtime.getCurrentUser().name;
                var date = new Date();
                var hourMexico = format.format({
                    value: date,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MEXICO_CITY
                });

                var parseDate = format.parse({
                    value: hourMexico,
                    type: format.Type.DATETIME
                });
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
         * @summary función que servirá para guardar la lista en un txt
         */
        function getDataForFile(idFile) {
            try {
                var fileObj = file.load({
                    id: idFile
                });
                var getArrayList = JSON.parse(fileObj.getContents());
                itemsList = [getArrayList.arrmxn, getArrayList.arrusd]
                log.audit({ title: 'Items For file: ', details: itemsList });
            } catch (error) {
                log.error({ title: 'Error getDataForFile: ', details: error });
            }
        }

        function creaPanel() {
            try {
                var form = serverWidget.createForm({ title: "Precios" });

                form.clientScriptModulePath = './tkio_pricing_cs.js';

                //=============================================Botones
                form.addButton({ id: "custpage_tkio_filtrar", label: "Filtrar", functionName: "filtrar" });
                form.addButton({ id: "custpage_tkio_incrementar", label: "Incrementar", functionName: "incrementar" });
                form.addButton({ id: "custpage_tkio_marcartodo", label: "Marcar todo", functionName: "markAll" });
                form.addButton({ id: "custpage_tkio_desmarcartodo", label: "Desmarcar todo", functionName: "dismarkAll" });

                //Campos
                var period = form.addField({ id: "custpage_tkio_periodocontable", type: serverWidget.FieldType.SELECT, source: record.Type.ACCOUNTING_PERIOD, label: "PERIODO CONTABLE" })
                // var cambioUSD = form.addField({ id: "custpage_tkio_cambiopeso", type: serverWidget.FieldType.FLOAT, label: "TIPO DE CAMBIO PESO-DOLAR" })
                var cambioUSD = form.addField({ id: "custpage_tkio_cambiopeso", type: serverWidget.FieldType.FLOAT, label: "TIPO DE CAMBIO MXP - USD" })
                var classFilter = form.addField({ id: "custpage_tkio_clase", type: serverWidget.FieldType.SELECT, source: record.Type.CLASSIFICATION, label: "CLASE" })


                var cambioMXN = form.addField({ id: "custpage_tkio_cambiodolar", type: serverWidget.FieldType.FLOAT, label: "TIPO DE CAMBIO USD - MXP" })

                if (params.periodo) { period.defaultValue = params.periodo; }
                if (params.clase) { classFilter.defaultValue = params.clase; }
                if (params.monedaMxn) { cambioMXN.defaultValue = params.monedaMxn; }
                if (params.monedaUsd) { cambioUSD.defaultValue = params.monedaUsd; }

                period.isMandatory = true;
                classFilter.isMandatory = true;
                cambioUSD.isMandatory = true;
                cambioMXN.isMandatory = true;

                //Creación de la tabla Precios MXN
                var sublistMXN = form.addSublist({ id: 'sublist_precios_mxn', type: serverWidget.SublistType.LIST, label: 'Precios MXN' });
                var idMXN = sublistMXN.addField({ id: 'sublist_valid_incrementar_mxn', type: serverWidget.FieldType.CHECKBOX, label: 'INCREMENTAR' });
                var id = sublistMXN.addField({ id: 'sublist_id_internal_item_mxn', type: serverWidget.FieldType.TEXT, label: 'Si ves esto, hola' });
                var itemMXN = sublistMXN.addField({ id: 'sublist_id_item_mxn', type: serverWidget.FieldType.TEXT, label: 'CODIGO ART' });
                var listPriceMXN = sublistMXN.addField({ id: 'sublist_list_price_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA' });
                var listPriceMXNOr = sublistMXN.addField({ id: 'sublist_list_price_or_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA ORIGINAL' });
                var piecesMXN = sublistMXN.addField({ id: 'sublist_pieces_mxn', type: serverWidget.FieldType.TEXT, label: 'VENTA PIEZAS' });
                var lastCostMXN = sublistMXN.addField({ id: 'sublist_last_cost_mxn', type: serverWidget.FieldType.TEXT, label: 'ULTIMO COSTO' });
                var salePriceMXN = sublistMXN.addField({ id: 'sublist_sale_price_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO VENTA' });
                var averageCostMXN = sublistMXN.addField({ id: 'sublist_average_cost_mxn', type: serverWidget.FieldType.TEXT, label: 'COSTO PROMEDIO' });
                var margenTeoricoMXN = sublistMXN.addField({ id: 'sublist_theoretical_margin_mxn', type: serverWidget.FieldType.PERCENT, label: 'MARGEN TEORICO' });
                var margenRealMXN = sublistMXN.addField({ id: 'sublist_real_margin_mxn', type: serverWidget.FieldType.PERCENT, label: 'MARGEN REAL' });
                var margenMinimoMXN = sublistMXN.addField({ id: 'sublist_minimum_margin_mxn', type: serverWidget.FieldType.PERCENT, label: 'MARGEN MINIMO' });
                var margenMaximoMXN = sublistMXN.addField({ id: 'sublist_maximum_margin_mxn', type: serverWidget.FieldType.PERCENT, label: 'MARGEN MAXIMO' });
                var monedaMxn = sublistMXN.addField({ id: 'sublist_currency_mxn', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                var incrementoSugeridoMXN = sublistMXN.addField({ id: 'sublist_suggested_increase_mxn', type: serverWidget.FieldType.PERCENT, label: 'INCREMENTO SUGERIDO' });
                var incrementoSugeridoMXNOR = sublistMXN.addField({ id: 'sublist_suggested_increase_or_mxn', type: serverWidget.FieldType.PERCENT, label: 'INCREMENTO SUGERIDO ORIGINAL' });

                id.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                itemMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceMXNOr.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                piecesMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                lastCostMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                salePriceMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                averageCostMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenTeoricoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenRealMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMinimoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMaximoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                monedaMxn.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                incrementoSugeridoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                incrementoSugeridoMXNOR.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                //Creación de la tabla Precios USD
                var sublistUSD = form.addSublist({ id: 'sublist_precios_usd', type: serverWidget.SublistType.LIST, label: 'Precios USD' });
                var id = sublistUSD.addField({ id: 'sublist_id_internal_item_usd', type: serverWidget.FieldType.TEXT, label: 'Si ves esto, hola' });
                var idUSD = sublistUSD.addField({ id: 'sublist_valid_incrementar_usd', type: serverWidget.FieldType.CHECKBOX, label: 'INCREMENTAR' });
                var itemUSD = sublistUSD.addField({ id: 'sublist_id_item_usd', type: serverWidget.FieldType.TEXT, label: 'CODIGO ART' });
                var listPriceUSD = sublistUSD.addField({ id: 'sublist_list_price_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA' });
                var listPriceUSDOr = sublistUSD.addField({ id: 'sublist_list_price_or_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA ORIGINAL' });
                var piecesUSD = sublistUSD.addField({ id: 'sublist_pieces_usd', type: serverWidget.FieldType.TEXT, label: 'VENTA PIEZAS' });
                var lastCostUSD = sublistUSD.addField({ id: 'sublist_last_cost_usd', type: serverWidget.FieldType.TEXT, label: 'ULTIMO COSTO' });
                var salePriceUSD = sublistUSD.addField({ id: 'sublist_sale_price_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO VENTA' });
                var averageCostUSD = sublistUSD.addField({ id: 'sublist_average_cost_usd', type: serverWidget.FieldType.TEXT, label: 'COSTO PROMEDIO' });
                var margenTeoricoUSD = sublistUSD.addField({ id: 'sublist_theoretical_margin_usd', type: serverWidget.FieldType.PERCENT, label: 'MARGEN TEORICO' });
                var margenRealUSD = sublistUSD.addField({ id: 'sublist_real_margin_usd', type: serverWidget.FieldType.PERCENT, label: 'MARGEN REAL' });
                var margenMinimoUSD = sublistUSD.addField({ id: 'sublist_minimum_margin_usd', type: serverWidget.FieldType.PERCENT, label: 'MARGEN MINIMO' });
                var margenMaximoUSD = sublistUSD.addField({ id: 'sublist_maximum_margin_usd', type: serverWidget.FieldType.PERCENT, label: 'MARGEN MAXIMO' });
                var monedaUsd = sublistUSD.addField({ id: 'sublist_currency_usd', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                var incrementoSugeridoUSD = sublistUSD.addField({ id: 'sublist_suggested_increase_usd', type: serverWidget.FieldType.PERCENT, label: 'INCREMENTO SUGERIDO' });
                var incrementoSugeridoUSDOR = sublistUSD.addField({ id: 'sublist_suggested_increase_or_usd', type: serverWidget.FieldType.PERCENT, label: 'INCREMENTO SUGERIDO ORIGINAL' });

                id.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                itemUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceUSDOr.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                piecesUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                lastCostUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                salePriceUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                averageCostUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenTeoricoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenRealUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMinimoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMaximoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                monedaUsd.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                incrementoSugeridoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                incrementoSugeridoUSDOR.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                //Modificamos la pagina
                return form;
            } catch (e) {
                log.error({ title: "error creaPanel", details: e });
            }
        }
        /**
         * 
         * @param {*} clase
         * Función para traer todos loa articulos de ensamblaje, 
         * de acuerdo al filtro de la clase 
         */
        function searchItemsEnsamble(clase, periodo, monedaMxn, monedaUsd) {
            try {
                var arrItemsAux = []; // arreglo de articulos de ensamblaje completado
                let idListMaterials = []; //id de la lista de materiales de cada articulo de ensamblaje
                let idItemsEnsamblaje = [];
                var assemblyitemSearchObj = search.create({
                    type: "assemblyitem",
                    filters:
                        [
                            ["type", "anyof", "Assembly"],
                            "AND",
                            ["class", "anyof", clase],
                            // "AND",
                            // ["internalid", "anyof", '5108'],
                            // "AND",
                            // ["custitem_tkio_art_subensasmblaje", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "itemid", summary: "GROUP", sort: search.Sort.ASC, label: "Nombre" }),
                            search.createColumn({ name: "displayname", summary: "GROUP", label: "Nombre para mostrar" }),
                            search.createColumn({ name: "salesdescription", summary: "GROUP", label: "Descripción" }),
                            search.createColumn({ name: "lastpurchaseprice", summary: "MAX", label: "Ultimo precio de compra" }),
                            search.createColumn({ name: "unitprice", join: "pricing", summary: "MAX", label: "Unit Price" }),
                            search.createColumn({ name: "custitem_tkio_max_margen_art", summary: "AVG", label: "Margen Máximo" }),
                            search.createColumn({ name: "custitem_tkio_min_margen_art", summary: "AVG", label: "Margen Minimo" }),
                            search.createColumn({ name: "class", summary: "GROUP", label: "Clase" }),
                            search.createColumn({ name: "averagecost", summary: "AVG", label: "Costo promedio" }),
                            search.createColumn({ name: "billofmaterialsid", join: "assemblyItemBillOfMaterials", summary: "GROUP", label: "Identificación de la lista de materiales" }),
                            search.createColumn({ name: "internalid", summary: "GROUP", label: "ID interno" }),
                            search.createColumn({ name: "currency", join: "pricing", summary: "GROUP", label: "Moneda" }),
                            search.createColumn({ name: "custitem_tkio_art_subensasmblaje", summary: "GROUP", label: "Artículo subensamblaje" })
                        ],
                    id: 'customsearch_get_items_ens_ss',
                    title: 'FB - Obten Items Ensamblaje'
                });
                var searchResultCount = assemblyitemSearchObj.runPaged().count;
                // assemblyitemSearchObj.save()
                log.debug("assemblyitemSearchObj result count", searchResultCount);
                // assemblyitemSearchObj.run().each(function (result) {
                var myPagedResults = assemblyitemSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        // log.audit({ title: 'currencyItem', details: result });
                        // var id = result.id;
                        var id = result.getValue({ name: "internalid", summary: "GROUP" });
                        arrID += id + ','
                        var itemCode = result.getValue({ name: "itemid", summary: "GROUP" });
                        var idMaterialList = result.getValue({ name: "billofmaterialsid", join: "assemblyItemBillOfMaterials", summary: "GROUP" });
                        // var listPrice = parseFloat(result.getValue({ name: "baseprice", summary: "AVG" })) || 1;
                        var currencyItem = result.getValue({ name: "currency", join: "pricing", summary: "GROUP" });
                        var listPrice = parseFloat(result.getValue({ name: "unitprice", join: "pricing", summary: "MAX" })) || 0;
                        var lastpurchaseprice = parseFloat(result.getValue({ name: "lastpurchaseprice", summary: "MAX" })) || 0;
                        var min_margin = parseFloat(result.getValue({ name: "custitem_tkio_min_margen_art", summary: "AVG" }).replace('%', '')) || 0;
                        var max_margin = parseFloat(result.getValue({ name: "custitem_tkio_max_margen_art", summary: "AVG" }).replace('%', '')) || 0;
                        var averageCost = parseFloat(result.getValue({ name: "averagecost", summary: "AVG" })) || 0;
                        var artiSub = result.getValue({ name: "custitem_tkio_art_subensasmblaje", summary: "GROUP" }) || false;
                        idItemsEnsamblaje.push(id);
                        idListMaterials.push(idMaterialList);
                        // log.audit({ title: 'Articulo Ensamblaje', details: result });
                        log.debug({title: 'listPrice', details: listPrice});
                        log.debug({title: 'lastpurchaseprice', details: lastpurchaseprice});
                        arrItemsAux.push({
                            id: id,
                            itemCode: itemCode,
                            listPrice: Number(listPrice.toFixed(3)),
                            listPriceOr: Number(listPrice.toFixed(3)),
                            artiSub: artiSub,
                            pieces: 0,
                            lastCost: 0,
                            saleCost: 0,
                            currencyItem: currencyItem,
                            averageCost: averageCost,
                            min_margin: min_margin,
                            max_margin: max_margin,
                            clase: clase,
                            periodo: periodo,
                            monedaMxn: monedaMxn,
                            monedaUsd: monedaUsd,
                            real_margin: 0,
                            theoretical_margin: 0,
                            inc_suggest: 0,
                            amount: 0,
                            idMaterialList: idMaterialList,
                            materialList: [],
                        });
                        return true;
                    });
                }

                log.debug({ title: 'arrItemsAux', details: arrItemsAux });
                //Se obtiene la lista de manterial, lista de revision y con cada uno de los componentes que este tiene
                //en el articulo de encamblaje mediante el id de la lista de material
                let revision = (idListMaterials.length > 0 ? getListRevision(idListMaterials, arrItemsAux, monedaMxn, monedaUsd) : []);
                arrItemsAux.map(item => {
                    revision.forEach(rev => {
                        //Asginacion de la lista de revision y el ultimo costo
                        if (item.idMaterialList === rev.idMaterialList) {
                            item.materialList.push(rev);
                            item.materialList.forEach(rev => {
                                item.lastCost = (item.currencyItem === '2' ? rev.costUSD : rev.costMXN)
                            });
                        }
                    })
                });
                log.debug({ title: 'idItemsEnsamblaje:', details: idItemsEnsamblaje });
                let datosSO = (idItemsEnsamblaje.length > 0 ? getDataSO(periodo, idItemsEnsamblaje) : []);
                let datosOT = (idItemsEnsamblaje.length > 0 ? getDataOT(idItemsEnsamblaje) : []);
                log.audit({ title: 'datosOT', details: datosOT });
                log.audit({ title: 'datosSO', details: datosSO });
                log.debug({ title: 'arrItemsAux', details: arrItemsAux[0] });

                //Ajustando a aquellos articulos de ensamblaje que estan dentro de la lista de revisiones
                var arrItemsAux2 = arrItemsAux;

                arrItemsAux.map(item => {
                    (item.materialList[0].listaMateriales).map(itemsLista => {
                        for (var i = 0; i < arrItemsAux2.length; i++) {
                            if (arrItemsAux2[i].id === itemsLista.idItemComponent) {
                                item.lastCost += (item.currencyItem === arrItemsAux2[i].currencyItem ? arrItemsAux2[i].lastCost * parseFloat(itemsLista.cantidad) : (arrItemsAux2[i].currencyItem == '1' ? (arrItemsAux2[i].lastCost * monedaUsd) * parseFloat(itemsLista.cantidad) : (arrItemsAux2[i].lastCost * monedaMxnparseFloat(itemsLista.cantidad))));
                            }
                        }
                    })
                })
                arrItemsAux.map(item => {
                    //Asignacion del ultimo costo tomando en cuenta las ordenes de trabajo relacionadas al articulo de ensamblaje
                    datosOT.forEach(datos => {
                        if (item.id === datos.id) {
                            if (item.currencyItem === '1') {
                                item.lastCost += datos.cost
                                // item.lastCost += (datos.currency === '1' ? datos.cost : datos.cost / monedaMxn)
                            }
                            if (item.currencyItem === '2') {
                                item.lastCost += datos.cost
                            }
                        }
                    })
                    //Asignacion de datos relacionados con las ordenes de venta
                    datosSO.forEach(datos => {
                        if (item.id === datos.id && item.currencyItem === datos.currency) {
                            item.amount = datos.amount;
                            item.pieces = datos.quantity;
                            item.saleCost = Number(((datos.saleCost)).toFixed(3));
                            item.real_margin = ((datos.saleCost - item.averageCost) / datos.saleCost) * 100;
                        }
                    })
                    // var costoPromedio = (item.pieces === 0 ? item.averageCost : item.lastCost / item.pieces);
                    // item.averageCost = (costoPromedio < item.averageCost ? item.averageCost : costoPromedio);
                    item.theoretical_margin = (item.listPrice !== 0 ? Number((((item.listPrice - item.lastCost) / item.listPrice)).toFixed(3)) * 100 : 0);
                    item.inc_suggest = (item.theoretical_margin < item.max_margin ? item.max_margin - item.theoretical_margin : 0)
                });
                log.audit({ title: 'Articulo ensamblaje completo', details: arrItemsAux });
                return arrItemsAux;
            } catch (error) {
                log.error({ title: 'searchItemsEnsamble', details: error });
                return [];
            }
        }
        //Se obtienen las ordenes de ventas relacionadas con el articulo de ensamblaje, para determinar los costos
        //Tomando en cuenta los periodos de fecha establecidos
        function getDataSO(periodo, idItemsEnsamblaje) {
            try {
                log.audit({ title: 'periodo', details: periodo });
                let fechas = search.lookupFields({ type: 'accountingperiod', id: periodo, columns: ['startdate', 'enddate'] })
                log.audit({ title: 'fechas', details: fechas });
                let itemsData = [];
                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                /*log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })*/
                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["item.internalid", "anyof", idItemsEnsamblaje],
                            "AND",
                            ["trandate", "within", fechas.startdate, fechas.enddate]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "currency", summary: "GROUP", label: "Moneda" }),
                            search.createColumn({ name: "quantity", summary: "SUM", label: "Cantidad" }),
                            search.createColumn({ name: "fxamount", summary: "SUM", label: "Importe" }),
                            search.createColumn({ name: "internalid", join: "item", summary: "GROUP", label: "ID interno" })
                        ],
                    id: 'customsearch_get_sales_ens_ss',
                    title: 'FB - Obten ventas de Items - SS'
                });
                // salesorderSearchObj.save();
                var myPagedResults = salesorderSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        var id = result.getValue({ name: "internalid", join: "item", summary: "GROUP" });
                        var currency = result.getValue({ name: "currency", summary: "GROUP" });
                        var quantity = parseInt(result.getValue({ name: "quantity", summary: "SUM" }));
                        var amount = parseFloat(result.getValue({ name: "fxamount", summary: "SUM" }));
                        var saleCost = amount / quantity;
                        itemsData.push({
                            id: id,
                            currency: currency,
                            quantity: quantity,
                            amount: amount,
                            saleCost: saleCost
                        })
                        return true;
                    });
                }
                log.debug({ title: 'itemsData', details: itemsData });
                return itemsData;
            } catch (error) {
                log.error({ title: 'getDataSO', details: error });
                return [];
            }
        }
        //Se obtienen los gastos por mano de obra de cada articulo de ensamblaje
        function getDataOT(idItemsEnsamblaje) {
            try {
                let arrDataOT = [];
                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                /*log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })*/
                var workordercompletionSearchObj = search.create({
                    type: "workordercompletion",
                    filters:
                        [
                            ["type", "anyof", "WOCompl"],
                            "AND",
                            ["quantity", "greaterthan", "0"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["item.internalid", "anyof", idItemsEnsamblaje],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "ROUND({amount}/ABS({quantity}),3)", label: "Formula (Numeric)" }),
                            search.createColumn({ name: "item", summary: "GROUP", label: "Item" }),
                            search.createColumn({ name: "currency", summary: "GROUP", label: "Currency" })
                        ]
                });
                var searchResultCount = workordercompletionSearchObj.runPaged().count;
                log.debug("workordercompletionSearchObj result count", searchResultCount);
                // workordercompletionSearchObj.run().each(function (result) {
                var myPagedResults = workordercompletionSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        log.audit({ title: 'result', details: result });
                        var id = result.getValue({ name: "item", summary: "GROUP" });
                        var cost = Math.abs(parseFloat(result.getValue({ name: "formulanumeric", summary: "MAX" })));
                        var currency = result.getValue({ name: "currency", summary: "GROUP" });
                        arrDataOT.push({
                            id: id,
                            cost: cost,
                            currency: currency
                        })
                        return true;
                    });
                }
                return arrDataOT;
            } catch (e) {
                log.error({ title: 'Error getDataOT:', details: e });
                return []
            }
        }
        //Para el ultimo costo se calculara de la siguiente manera, se obtiene 
        // 1. la lista de revision
        // 2. La lista de los componente y con ello se hacen diversas busquedas guardadas, para obtener los costos mas altos:
        //      *De los ajustes de Inventario
        //      *De las recepciones de envio
        //      *De las facturas
        //      *De las ordenes de compra aqui se obtiene el promedio
        /**
         * 
         * @param {*} idMaterials
         * Función para traer el id de las revisiones de cada artículo de ensamblaje 
         */
        function getListRevision(idMaterials, arrItemsAux, monedaMxn, monedaUsd) {
            try {
                let arrListRev = [];//la lista de revisiones de cada lista de materiales
                let idRevs = [];//la lista auxiliar de id de las revisiones
                var bomSearchObj = search.create({
                    type: "bom",
                    filters:
                        [
                            ["internalid", "anyof", idMaterials]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "name", label: "Nombre" }),
                            search.createColumn({ name: "internalid", join: "revision", label: "ID interno" }),
                            search.createColumn({ name: "billofmaterials", join: "revision", label: "Lista de materiales" }),
                            search.createColumn({ name: "name", join: "revision", label: "Nombre" })
                        ]
                });

                // bomSearchObj.run().each(function (result) {
                var myPagedResults = bomSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        var idRevision = result.getValue({ name: "internalid", join: "revision" });
                        var idMaterialList = result.id;
                        idRevs.push(idRevision);
                        arrListRev.push({
                            idRevision: idRevision,
                            averageCostListRev: 0,
                            costMXN: 0,
                            costUSD: 0,
                            idMaterialList: idMaterialList,//para relacionar la lista de revision con sus respectivos articulos de ensamblaje
                            listaMateriales: []//lista de los componentes de las revisiones
                        });
                        return true;
                    });
                }

                let dataGetListComponent = getListComponents(idRevs, arrItemsAux, monedaMxn, monedaUsd);
                //let listaMateriales = dataGetListComponent[1];
                //let averageCostListRev = dataGetListComponent[0];
                //Relación entre la lista de materiales y la lista de revisión
                log.audit({ title: 'arrListRev', details: arrListRev });
                log.audit({ title: 'dataGetListComponent', details: dataGetListComponent });
                arrListRev.map(listaRevision => {
                    dataGetListComponent.forEach(listMaterial => {
                        if (listaRevision.idRevision === listMaterial.id) {
                            listaRevision.listaMateriales.push(listMaterial);
                            listaRevision.costMXN += (listMaterial.costMXN);
                            listaRevision.costUSD += (listMaterial.costUSD);
                            // listaRevision.costMXN += (listMaterial.costMXN === 0 ? listMaterial.listPrice : listMaterial.costMXN);
                            // listaRevision.costUSD += (listMaterial.costUSD === 0 ? listMaterial.listPrice : listMaterial.costUSD);
                        }
                    })
                })
                log.audit({ title: 'Lista de revisiones', details: arrListRev });
                return arrListRev;
            } catch (error) {
                log.error({ title: 'getListRevision', details: error });
                return [];
            }
        }
        /**
         * 
         * @param {*} arrListRev
         * Función para traer el artículo de inventariable de cada lista de revision 
         */
        function getListComponents(idRev, arrItemsAux, monedaMxn, monedaUsd) {
            try {
                let arrListComponents = [];
                var averageCostListRev = 0;
                var idItemArt = [];
                var idItem = [];
                var bomrevisionSearchObj = search.create({
                    type: "bomrevision",
                    filters:
                        [
                            ["internalid", "anyof", idRev]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "billofmaterials", label: "Lista de materiales" }),
                            search.createColumn({ name: "name", label: "Nombre" }),
                            search.createColumn({ name: "item", join: "component", label: "Artículo" }),
                            search.createColumn({ name: "quantity", join: "component", label: "Cantidad" }),
                            search.createColumn({ name: "baseunits", join: "component", label: "Base Units" })
                        ],
                    id: 'customsearch_bomrevision_list',
                    title: 'getListComponents'
                });
                // bomrevisionSearchObj.save()
                // bomrevisionSearchObj.run().each(function (result) {
                var myPagedResults = bomrevisionSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        var id = result.id;
                        var idItemComponent = result.getValue({ name: "item", join: "component" });
                        var cantidad = result.getValue({ name: "quantity", join: "component" });
                        var unit = result.getValue({ name: "baseunits", join: "component" });
                        // let dataItem = search.lookupFields({ type: search.Type.ITEM, id: idItemComponent, columns: ['baseprice', 'vendorpricecurrency', 'type', 'averagecost'] })
                        // var listPrice = parseFloat(dataItem.baseprice) || 0;
                        // var vendorpricecurrency = dataItem.vendorpricecurrency;
                        // var averageCost = parseFloat(dataItem.averagecost) || 0;
                        // if (dataItem.type[0].value.toUpperCase() === "INVTPART") {
                        //     idItemArt.push(idItemComponent);
                        // }
                        idItem.push(idItemComponent);
                        arrListComponents.push({
                            id: id,
                            idItemComponent: idItemComponent,
                            cantidad: cantidad,
                            unit: unit,
                            listPrice: 0,
                            averageCost: 0,
                            cost: 0,
                            costUSD: 0,
                            costMXN: 0,
                            vendorpricecurrency: 0,
                            type: '',
                            artiSub: false
                        });
                        return true;
                    });
                }
                // Se quitan los IDS repetidos
                idItem = [... new Set(idItem)];
                // idItem = ['4459'];
                log.debug({ title: 'Count Articulos de inventario: ', details: idItem.length });
                //Costos mas altos
                log.debug({ title: 'idItem', details: idItem });
                // Busqueda del inventario 
                idItemArt = getDataII(idItem, arrListComponents);
                log.audit({ title: 'arrListComponents dataII', details: arrListComponents });

                //Se obtiene el gasto de cada articulo de inventario, 
                //mediante una busqueda de las ordenes de compra 
                var dataPO = getDataPO(idItemArt, arrListComponents, monedaMxn, monedaUsd);
                log.audit({ title: 'dataPO', details: dataPO });

                // let datos = dataPO.concat(dataAI);
                let datos = dataPO;
                var datoMasAlto = getDatoMasAlto(datos, 'PO');
                log.audit({ title: 'datPO result:', details: datoMasAlto });

                //Costos incrementables
                //Busqueda de las recepciones de articulo (Costo de envio)
                var dataLCDatos = getLandedCost(idItemArt);
                var dataLCDatosperLine = getLandedCostPerLine(idItemArt) || [];
                dataLCDatos = dataLCDatos.concat(dataLCDatosperLine)
                log.debug({ title: 'dataLC result:', details: dataLCDatos });
                var dataLC = getDatoMasAlto(dataLCDatos, 'IR');

                //Busqueda de las facturas (Agente aduanal y seguro) 
                var dataBillDatos = getDataBill(idItemArt);
                log.debug({ title: 'dataBill resultados:', details: dataBillDatos });
                var dataBill = getDatoMasAlto(dataBillDatos, 'BILL');
                log.debug({ title: 'dataBILL result:', details: dataBill });

                log.audit({ title: 'arrListComponents.length', details: arrListComponents.length });
                log.audit({ title: 'arrListComponents', details: arrListComponents });
                arrListComponents.map(itemMod => {
                    var costoUSD = 0.0;
                    var costoMXN = 0.0;
                    //log.debug({ title: 'Costo sumando BILL', details: { costoUSD: costoUSD, costoMXN: costoMXN } });
                    //Se asigna el costo mas alto de ajuste de inventario o de orden de compra
                    var unidadCostoConvertidaPO = 0;
                    datoMasAlto.forEach(dataItem => {

                        if (itemMod.idItemComponent === dataItem.id) {
                            let flagCondition = true;
                            if (flagCondition) {
                                if (dataItem.currency === '2') {
                                    unidadCostoConvertidaPO = useConvertions(dataItem, itemMod, unitsValue, false)
                                    costoUSD += unidadCostoConvertidaPO;
                                    costoMXN += unidadCostoConvertidaPO * monedaMxn;
                                    // costoUSD += dataItem.amount;
                                    // costoMXN += dataItem.amount * monedaMxn;
                                } else {
                                    unidadCostoConvertidaPO = useConvertions(dataItem, itemMod, unitsValue, false)
                                    costoMXN += unidadCostoConvertidaPO;
                                    costoUSD += unidadCostoConvertidaPO / monedaUsd;
                                    // costoMXN += dataItem.amount;
                                    // costoUSD += dataItem.amount * monedaUsd;
                                }
                                flagCondition = false
                            }
                        }
                        unidadCostoConvertidaPO = 0;
                    })
                    log.debug({ title: 'Costo sumando Costo mas alto', details: { item: itemMod.idItemComponent, costoUSD: costoUSD, costoMXN: costoMXN } });
                    var unidadCostoConvertidaLC = 0;
                    //Se asignan los costos de envio
                    dataLC.forEach(dataItem => {
                        if (itemMod.idItemComponent === dataItem.id) {
                            let flagCondition = true;
                            if (flagCondition) {
                                if (dataItem.currency === '2') {
                                    unidadCostoConvertidaLC = useConvertions(dataItem, itemMod, unitsValue, false)
                                    costoUSD += unidadCostoConvertidaLC;
                                    costoMXN += unidadCostoConvertidaLC * monedaMxn;
                                    // costoUSD += dataItem.amount;
                                    // costoMXN += dataItem.amount * monedaMxn;
                                } else {
                                    unidadCostoConvertidaLC = useConvertions(dataItem, itemMod, unitsValue, false)
                                    costoMXN += unidadCostoConvertidaLC;
                                    costoUSD += unidadCostoConvertidaLC / monedaUsd;
                                    // costoMXN += dataItem.amount;
                                    // costoUSD += dataItem.amount * monedaUsd;
                                }
                                flagCondition = false
                            }
                        }
                        unidadCostoConvertidaLC = 0
                    })
                    log.debug({ title: 'Costo sumando LC', details: { item: itemMod.idItemComponent, costoUSD: costoUSD, costoMXN: costoMXN } });
                    //Se asignan el agente aduanal y el seguro
                    var unidadCostoConvertidaBILL = 0;
                    dataBill.forEach(dataItem => {
                        if (itemMod.idItemComponent === dataItem.id) {
                            let flagCondition = true;
                            if (flagCondition) {

                                if (dataItem.currency === '2') {
                                    unidadCostoConvertidaBILL = useConvertions(dataItem, itemMod, unitsValue, false)
                                    costoUSD += unidadCostoConvertidaBILL;
                                    costoMXN += unidadCostoConvertidaBILL * monedaMxn;
                                    // costoUSD += dataItem.amount;
                                    // costoMXN += dataItem.amount * monedaMxn;
                                } else {
                                    unidadCostoConvertidaBILL = useConvertions(dataItem, itemMod, unitsValue, false);
                                    costoMXN += unidadCostoConvertidaBILL;
                                    costoUSD += unidadCostoConvertidaBILL / monedaUsd;
                                    // costoMXN += dataItem.amount;
                                    // costoUSD += dataItem.amount * monedaUsd;
                                }
                                flagCondition = false
                            }
                        }
                        // log.audit({ title: 'unidadCostoConvertidaBILL', details: unidadCostoConvertidaBILL });
                        unidadCostoConvertidaBILL = 0
                    })
                    log.debug({ title: 'Costo sumando Bill', details: { item: itemMod.idItemComponent, costoUSD: costoUSD, costoMXN: costoMXN } });

                    // Cada una de las uno de todos los costos es multiplicado por la cantidad requerida dentro de la revision
                    itemMod.costUSD += (costoUSD) * parseFloat(itemMod.cantidad);
                    itemMod.costMXN += (costoMXN) * parseFloat(itemMod.cantidad);
                    // itemMod.costMXN += costoMXN;
                })

                log.audit({ title: 'arrListComponents ultimo costo:', details: arrListComponents });
                log.debug({ title: 'averageCostListRev', details: averageCostListRev });

                return arrListComponents;
            } catch (error) {
                log.error({ title: 'getListComponents', details: error });
                return [];
            }
        }
        function useConvertions(itemCost, componente, unitsValueLocal, imprime) {
            try {
                for (keyGen in unitsValueLocal) {
                    let unidadesPibote = unitsValueLocal[keyGen];
                    if (unidadesPibote[componente.unit]) {
                        for (keySub in unidadesPibote) {
                            let unidadCosto = unidadesPibote[keySub];
                            // let unidadCosto = Object.values(unidadesPibote).find(item => item.unitNameAbr === itemCost.unitabbreviation)

                            if (unidadCosto.unitNameAbr === itemCost.unitabbreviation) {
                                // log.debug({ title: 'Unidades del articulo', details: unidadesPibote[componente.unit] });
                                // log.debug({ title: 'Unidades del costo', details: unidadCosto });
                                let unidadBase = Object.values(unidadesPibote).find(item => item.unitBase === true)
                                // log.audit({ title: 'unidadBase', details: unidadBase });
                                let montoConversion = 0
                                if (imprime) {
                                    log.debug({ title: 'Unidades por categoria encontrada:', details: unidadesPibote });
                                    log.debug({ title: 'Unidades por categoria pibote', details: unidadCosto });
                                    log.audit({ title: 'Datos de BG', details: { itemCost, componente } });
                                    log.audit({ title: 'Unidad comparada', details: { compare: componente.unit, keySub } });
                                }
                                if (componente.unit === keySub) {
                                    montoConversion = itemCost.amount;
                                    if (imprime) {
                                        log.audit({ title: 'Monto Estatico:', details: montoConversion });
                                    }
                                    return montoConversion;
                                } else {
                                    let unidadConvertidad = ((unidadesPibote[componente.unit].value * itemCost.amount) / unidadCosto.value);
                                    montoConversion = unidadConvertidad;
                                    if (imprime) {
                                        log.audit({ title: 'Monto Conversion', details: montoConversion });
                                    }
                                    return montoConversion;
                                }
                            }
                        }
                    }
                }
                return 0
            } catch (e) {
                log.error({ title: 'Error useConvertions:', details: e });
                return 0
            }
        }
        /**
        * 
        * @param {*} idItemArt
        * Función para traer los promedios por articulo inventariable 
        */
        function getDataII(idItemArt, arrListComponents) {
            try {
                let arrInventoryItem = [];
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            "internalid", "anyof", idItemArt
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", summary: "GROUP", label: "Internal ID" }),
                            search.createColumn({ name: "itemid", summary: "GROUP", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "locationaveragecost", summary: "MAX", label: "Location Average Cost" }),
                            search.createColumn({ name: "currency", join: "vendor", summary: "GROUP", label: "Currency" }),
                            search.createColumn({ name: "baseprice", summary: "MAX", label: "Base Price" }),
                            search.createColumn({ name: "type", summary: "GROUP", label: "Type" }),
                            search.createColumn({ name: "averagecost", summary: "AVG", label: "Average Cost" }),
                            search.createColumn({ name: "custitem_tkio_art_subensasmblaje", summary: "GROUP", label: "Artículo subensamblaje" })
                        ]
                });
                var searchResultCount = itemSearchObj.runPaged().count;
                log.debug("itemSearchObj result count", searchResultCount);
                // itemSearchObj.run().each(function (result) {
                var myPagedResults = itemSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        var id = result.getValue({ name: "internalid", summary: "GROUP" });
                        var listPrice = parseFloat(result.getValue({ name: "baseprice", summary: "MAX" })) || 0;
                        var baseprice = parseFloat(result.getValue({ name: "locationaveragecost", summary: "MAX" })) || 0;
                        var averageCost = parseFloat(result.getValue({ name: "averagecost", summary: "AVG" })) || 0;
                        var type = result.getValue({ name: "type", summary: "GROUP" });
                        var currency = result.getValue({ name: "currency", join: "vendor", summary: "GROUP" }) || '1';
                        var artiSub = result.getValue({ name: "custitem_tkio_art_subensasmblaje", summary: "GROUP" }) || false;
                        arrInventoryItem.push({
                            id: id,
                            amount: parseFloat(baseprice),
                            listPrice: listPrice,
                            currency: currency,
                            averageCost: averageCost,
                            type: type,
                            artiSub: artiSub
                        })
                        return true;
                    });
                }
                log.audit({ title: 'arrInventoryItem', details: arrInventoryItem });
                var itemsIdInv = ''
                arrListComponents.map(itemsList => {
                    for (var i = 0; i < arrInventoryItem.length; i++) {
                        if (itemsList.idItemComponent === arrInventoryItem[i].id) {
                            itemsIdInv += (arrInventoryItem[i].type.toUpperCase() === "INVTPART" ? itemsList.idItemComponent + ',' : '');
                            itemsList.listPrice = arrInventoryItem[i].listPrice;
                            itemsList.vendorpricecurrency = arrInventoryItem[i].currency || '';
                            itemsList.averageCost = arrInventoryItem[i].averageCost;
                            itemsList.type = arrInventoryItem[i].type;
                            itemsList.artiSub = arrInventoryItem[i].artiSub;
                        }
                    }
                });
                itemsIdInv = itemsIdInv.split(',')
                itemsIdInv = [... new Set(itemsIdInv)];
                itemsIdInv = itemsIdInv.filter(id => id !== '');
                log.audit({ title: 'itemsIdInv ', details: itemsIdInv });

                return itemsIdInv
            } catch (e) {
                log.error({ title: 'Error getDataII:', details: e });
            }
        }
        function getLandedCost(idItemArt) {
            try {
                let arrLandedCost = [];
                let idsLandedCost = [];
                let arrDataSearch = [];

                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })
                var itemreceiptSearchObj = search.create({
                    type: "itemreceipt",
                    filters:
                        [
                            // ["item", "anyof", idItemArt],
                            // "AND",
                            ["landedcostperline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["amount", "greaterthan", "0.00"],
                            "AND",
                            ["unit", "noneof", "@NONE@"],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin],
                            "AND",
                            ["custbody_tkio_landed_cost", "isnotempty", ""]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "ID interno" }),
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({ name: "quantityuom", label: "Quantity in Transaction Units" }),
                            search.createColumn({ name: "currency", label: "Currency" }),
                            search.createColumn({ name: "formulatext", formula: "{custbody_tkio_landed_cost}", label: "Costo General " }),
                            search.createColumn({ name: "unitabbreviation", label: "Units" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "amount", label: "Amount" })
                        ],
                    id: 'customsearch_getlandedcost',
                    title: 'getList LC 2'
                });

                // itemreceiptSearchObj.save()
                var searchResultCount = itemreceiptSearchObj.runPaged().count;
                log.audit({ title: 'searchResultCount', details: searchResultCount });
                // itemreceiptSearchObj.run().each(function (result) {
                var myPagedResults = itemreceiptSearchObj.runPaged({
                    pageSize: 1000
                });
                let columnsName = itemreceiptSearchObj.run().columns;
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({ index: thePageRanges[i].index });
                    thepageData.data.forEach(function (result) {
                        log.audit({ title: 'result', details: result });
                        let objPib = {};
                        let objAux = {};
                        columnsName.forEach(obj => {
                            if (obj.join) {
                                if (objAux[obj.join]) {
                                    objAux[obj.join][obj.name] = {}
                                } else {
                                    objAux[obj.join] = {}
                                    objAux[obj.join][obj.name] = {}
                                }
                            } else {
                                objAux[obj.name] = {}
                            }
                        });
                        objPib = objAux;
                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        arrDataSearch.push(objPib);

                        return true;
                    });
                }
                let arrGrouped = arrDataSearch.reduce((acc, curr) => {
                    const transactionId = curr.internalid.value;

                    if (!acc[transactionId]) {
                        acc[transactionId] = [];
                    }
                    acc[transactionId].push(curr);
                    return acc;
                }, {})
                log.audit({ title: 'Costos incrementables por LC GENERAL', details: arrGrouped });

                let arrFinalCost = []
                for (transactionId in arrGrouped) {
                    let arrInt = arrGrouped[transactionId];
                    let numLines = arrInt.length;
                    arrInt.forEach(line => {
                        arrFinalCost.push({
                            id: line.item.value,
                            amount: ((parseFloat(line.formulatext) / numLines) / parseFloat(line.quantityuom)),
                            currency: line.currency.value,
                            unit: line.unit,
                            unitabbreviation: line.unitabbreviation,
                        });
                    })
                }
                log.audit({ title: 'Costos incrementables por LC GENERAL', details: arrFinalCost });
                return arrFinalCost;
            } catch (e) {
                log.error({ title: 'Error getLandedCost:', details: e });
                return [];
            }
        }
        function getLandedCostPerLine(idItemArt) {
            try {
                let arrLandedCost = [];
                let idsLandedCost = [];
                var arrDataSearch = []

                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })
                var itemreceiptSearchObj = search.create({
                    type: "itemreceipt",
                    filters:
                        [
                            ["type", "anyof", "ItemRcpt"],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin],
                            "AND",
                            ["anylineitem", "anyof", idItemArt],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["landedcostperline", "is", "T"],
                            "AND",
                            ["amount", "greaterthan", "0.00"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({ name: "landedcostperline", label: "Landed Cost per Line" }),
                            search.createColumn({ name: "fxrate", label: "Item Rate" }),
                            search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }),
                            search.createColumn({ name: "amount", label: "Amount" }),
                            search.createColumn({ name: "formulacurrency", formula: "{amount}/{exchangerate}", label: "Formula (Currency)" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "quantityshiprecv", label: "Quantity Fulfilled/Received" }),
                            search.createColumn({ name: "formulatext", formula: "{landedcostperline}", label: "Formula (Text)" }),
                            search.createColumn({ name: "unitid", label: "Unit Id" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "unitabbreviation", label: "Units" }),
                            search.createColumn({ name: "quantityuom", label: "Quantity in Transaction Units" }),
                            search.createColumn({ name: "currency", label: "Currency" })
                        ]
                });
                var searchResultCount = itemreceiptSearchObj.runPaged().count;
                log.debug("itemreceiptSearchObj result count", searchResultCount);
                var myPagedResults = itemreceiptSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;

                let columnsName = itemreceiptSearchObj.run().columns;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({ index: thePageRanges[i].index });
                    thepageData.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = {};
                        let objAux = {};
                        columnsName.forEach(obj => {
                            if (obj.join) {
                                if (objAux[obj.join]) {
                                    objAux[obj.join][obj.name] = {}
                                } else {
                                    objAux[obj.join] = {}
                                    objAux[obj.join][obj.name] = {}
                                }
                            } else {
                                objAux[obj.name] = {}
                            }
                        });
                        objPib = objAux;
                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        if (idItemArt.includes(objPib.item.value)) {
                            arrDataSearch.push(objPib);
                        }
                        return true;
                    });

                }
                log.audit({ title: 'arrDataSearch', details: arrDataSearch });
                let arrGrouped = arrDataSearch.reduce((acc, curr) => {
                    const { item, internalid } = curr;

                    const transactionId = internalid.value
                    const itemId = item.value

                    if (!acc[transactionId]) {
                        acc[transactionId] = {};
                    }
                    if (!acc[transactionId][itemId]) {
                        acc[transactionId][itemId] = [];
                    }
                    acc[transactionId][itemId].push(curr);
                    return acc;
                }, {})
                let arrCostLC = [];
                for (transactionId in arrGrouped) {
                    let transactionPib = arrGrouped[transactionId];
                    for (itemId in transactionPib) {
                        let arrItems = transactionPib[itemId];
                        let objComp = {
                            id: '',
                            fxamount: 0.0,
                            amount: 0.0,
                            qty: 0.0,
                            currency: '',
                            unit: '',
                            unitabbreviation: '',
                        };
                        arrItems.forEach(lines => {
                            if (lines.fxrate === '') {
                                objComp.id = lines.item.value;
                                objComp.fxamount = parseFloat(lines.fxamount)
                            } else {
                                objComp.qty = parseFloat(lines.quantityuom)
                                objComp.currency = lines.currency.value;
                                objComp.unit = lines.unit;
                                objComp.unitabbreviation = lines.unitabbreviation;
                            }
                        })
                        objComp.amount = objComp.fxamount / objComp.qty
                        arrCostLC.push(objComp)
                    }
                }
                log.audit({ title: 'arrGrouped', details: arrGrouped["995"] });
                log.audit({ title: 'arrCostLC', details: arrCostLC });
                return arrCostLC;
            } catch (e) {
                log.error({ title: 'Error getLandedCostPerLine:', details: e });
                return [];
            }
        }
        function getDataBill(itemids) {
            try {
                let idItemArt = itemids.filter(item => item !== '');

                log.audit({ title: 'idItemArt', details: idItemArt });
                let arrDataBill = [];
                let idsBill = [];
                //var fechaOri = getDateTransaction();
                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                var vendorbillSearchObj = search.create({
                    type: "vendorbill",
                    filters:
                        [
                            [["type", "anyof", "VendBill"], "AND",
                            ["mainline", "is", "F"], "AND",
                            [["expensecategory", "anyof", "184", "91", "277", "200", "14", "107", "249", "63", "156"], "OR",
                            ["anylineitem", "anyof", idItemArt]], "AND",
                            ["trandate", "within", fechaInicio, fechaFin]]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "item", label: "Artículo" }),
                            search.createColumn({ name: "internalid", join: "item", label: "ID interno" }),
                            search.createColumn({ name: "amount", label: "Importe" }),
                            search.createColumn({ name: "expensecategory", label: "Categoría de gastos" }),
                            search.createColumn({ name: "internalid", join: "expenseCategory", label: "ID interno" }),
                            search.createColumn({ name: "currency", label: "Currency" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "formulanumeric", formula: "ROUND({fxamount}, 4)", label: "Formula (Numeric)" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "unitabbreviation", label: "Units" }),
                            search.createColumn({ name: "quantityuom", label: "Quantity in Transaction Units" })
                        ]
                });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                var objAux = {
                    idBill: '',
                    lines: []
                }
                // vendorbillSearchObj.run().each(function (result) {
                var myPagedResults = vendorbillSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        //log.debug({ title: 'result', details: result });
                        var idBill = result.getValue({ name: 'internalid' });
                        var amount = result.getValue({ name: "formulanumeric", formula: "ROUND({fxamount}, 4)" });
                        var category = result.getValue({ name: 'internalid', join: 'expensecategory' });
                        var idItem = result.getValue({ name: "internalid", join: "item" });
                        var currency = result.getValue({ name: "currency" });
                        var quantity = Math.abs(parseFloat(result.getValue({ name: "quantityuom" })));
                        var unit = result.getValue({ name: "unit" });
                        var unitabbreviation = result.getValue({ name: "unitabbreviation" });
                        var cat = (idItem ? false : (category ? true : false));
                        var id = (idItem ? idItem : category)
                        idsBill.push(idBill);
                        arrDataBill.push({
                            idBill: idBill,
                            id: id,
                            cat: cat,
                            amount: amount,
                            currency: currency,
                            quantity: quantity,
                            unit: unit,
                            unitabbreviation: unitabbreviation
                        });
                        return true;
                    });
                }

                let bills = [];
                let idsBillNew = [... new Set(idsBill.map(n => n))];
                //log.audit({ title: 'idsBillNew', details: idsBillNew });
                idsBillNew.forEach(bill => {
                    bills.push({
                        id: bill,
                        costos: []
                    });
                });

                bills.map(bill => {
                    arrDataBill.forEach(trd => {
                        if (bill.id === trd.idBill && (trd.cat === true || idItemArt.includes(trd.id))) {
                            bill.costos.push(trd)
                        }
                    })
                });
                log.debug({ title: 'bills', details: bills });

                let arrItemsBill = [];
                bills.forEach(bill => {
                    var costos = bill.costos;
                    var insert = false;
                    var exist_gasto = false;
                    var amount = 0;
                    var contLines = 0;
                    var ids = [];
                    costos.forEach(item => {
                        if (item.cat) {
                            amount += parseFloat(item.amount);
                            exist_gasto = true;
                        } else {
                            contLines += 1;
                            ids.push({
                                id: item.id,
                                quantity: item.quantity,
                                currency: item.currency,
                                unit: item.unit,
                                unitabbreviation: item.unitabbreviation,
                            });
                            insert = true;
                        }
                    });
                    if (insert && exist_gasto) {
                        // arrItemsBill.push({
                        //     ids: ids,
                        //     amount:amount
                        // });
                        ids.forEach(item => {
                            arrItemsBill.push({
                                id: item.id,
                                amount: ((amount / contLines) / item.quantity),
                                currency: item.currency,
                                unit: item.unit,
                                unitabbreviation: item.unitabbreviation,
                            });
                        })
                    }
                    contLines = 0;
                })
                //En caso de que una factura tenga mas articulos de una misma lista de revision
                //¿Se hace un promedio del costo de los ariculos que esten dentro de la factura? o ¿se coloca el valor completo del costo de la factura?
                log.debug({ title: 'Agrupacion de gasto por item', details: arrItemsBill });

                return arrItemsBill;
            } catch (e) {
                log.error({ title: 'Error getDatBill:', details: e });
                return [];
            }
        }
        /**
        * 
        * 
        * Función para traer los gastos por articulo inventariable 
        */
        function getDataPO(idItemArt, arrListComponents, monedaMxn, monedaUsd) {
            try {
                let dataPOforItem = [];
                let idOpList = [];
                var date = new Date()
                var fecha = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                //log.debug({ title: 'Fecha actual: ', details: fecha });
                date = date.setMonth(date.getMonth() - 12)
                //log.debug({ title: 'date:', details: date });
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fecha[2];
                log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })
                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                        [
                            ["type", "anyof", "PurchOrd"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["anylineitem", "anyof", idItemArt],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["purchaseorder.status", "noneof", "PurchCon:R"],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin]
                        ],
                    columns:
                        [
                            // search.createColumn({ name: "formulanumeric", formula: "ROUND(({fxamount}+ABS({taxamount}/{exchangerate}))/{quantity},4)", label: "Fórmula (numérica)" }),
                            search.createColumn({ name: "formulanumeric", formula: "{fxrate}", label: "Fórmula (numérica)" }),
                            search.createColumn({ name: "item", label: "Artículo" }),
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "currency", label: "Currency" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "unitabbreviation", label: "Units" }),
                            search.createColumn({ name: "formulanumeric2", formula: "ROUND(({fxamount}/({quantityuom})),4)", label: "Formula (Numeric)" })
                        ]
                });
                var idOp = "i";
                // purchaseorderSearchObj.run().each(function (result) {
                var myPagedResults = purchaseorderSearchObj.runPaged({
                    pageSize: 1000
                });
                var thePageRanges = myPagedResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({
                        index: thePageRanges[i].index
                    });
                    thepageData.data.forEach(function (result) {
                        var id = result.id;
                        var idItem = result.getValue({ name: "item" });
                        // var gasto = result.getValue({ name: "formulanumeric", formula: "ROUND(({fxamount}+ABS({taxamount}/{exchangerate}))/{quantity},4)" });
                        // var amount = result.getValue({ name: "formulanumeric", formula: "{fxrate}" });
                        var amount = result.getValue({ name: "formulanumeric2", formula: "ROUND(({fxamount}/({quantityuom})),4)" });
                        var currency = result.getValue({ name: "currency" });
                        var quantity = result.getValue({ name: "quantity" });
                        var unit = result.getValue({ name: "unit" });
                        var unitabbreviation = result.getValue({ name: "unitabbreviation" });
                        if (idOp === "i") {
                            idOp = id;
                            idOpList.push({
                                id: idOp,
                                amount: 0,
                                listItemsCost: []
                            });
                            // log.audit({title: 'getDATAPO result', details: idOp });
                        }
                        if (idOp !== id) {
                            idOp = id;
                            idOpList.push({
                                id: idOp,
                                amount: 0,
                                listItemsCost: []
                            });
                            // log.audit({title: 'getDATAPO result', details: idOp });
                        }
                        dataPOforItem.push({
                            id: id,
                            idItem: idItem,
                            amount: amount,
                            currency: currency,
                            unit: unit,
                            unitabbreviation: unitabbreviation,
                        })
                        return true;
                    });
                }
                //log.audit({ title: 'idOpList', details: idOpList });
                //log.audit({ title: 'dataPOforItem', details: dataPOforItem });
                //idOpList  -> Servira para rellenar de ordenes de venta con cada uno de sus gastos incluyendo el del articulo inventariable a buscar

                //Se agrupa por orden de compra para hacer un filtro por articulo
                idOpList.map(op => {
                    dataPOforItem.forEach(itemsPO => {
                        if (op.id === itemsPO.id) {
                            for (var i = 0; i < idItemArt.length; i++) {
                                if (idItemArt[i] === itemsPO.idItem || itemsPO.idItem === '') {
                                    op.listItemsCost.push({
                                        id: itemsPO.idItem || '',
                                        amount: parseFloat(itemsPO.amount) || 0,
                                        currency: itemsPO.currency,
                                        unit: itemsPO.unit,
                                        unitabbreviation: itemsPO.unitabbreviation,
                                    });
                                    break;
                                }
                            }
                        }
                    });
                });
                log.audit({ title: 'idOpList mapeo', details: idOpList });
                // log.audit({ title: 'arrListComponents: ', details: arrListComponents });
                let arrDataOp = []
                idOpList.forEach(op => {
                    let lista = op.listItemsCost
                    lista.forEach(artOp => {
                        arrDataOp.push(artOp);
                    })
                });
                log.audit({ title: 'arrDataOp', details: arrDataOp });
                /*let arrDataOpDef = [];
                var contadorOrdenes = 0;
                arrDataOp.map(actOp => {
                    var actual = actOp;
                    if (contadorOrdenes !== 0) {
                        var validacion = true
                        arrDataOpDef.map(actOpAux => {
                            if (actOpAux.id === actual.id) {
                                validacion = false;
                            }
                        })
                        arrDataOpDef.map(actOpAux => {
                            // log.audit({ title: 'arrDataOpDef', details: arrDataOpDef });
                            if (actOpAux.id !== actual.id && actual.id !== '' && validacion) {
                                arrDataOpDef.push(actual)
                                validacion = false
                            } else {
                                if (actOpAux.id === actual.id && actual.amount > actOpAux.amount) {
                                    actOpAux.amount = actual.amount;
                                }
                            }
                        })
                    } else {
                        if (actual.id !== '') {
                            arrDataOpDef.push(actual)
                            contadorOrdenes++;
                        }
                    }
                })
                log.audit({ title: 'arrDataOpDef', details: arrDataOpDef });*/
                // return arrDataOpDef;
                return arrDataOp;
            } catch (error) {
                log.error({ title: 'getDataPO', details: error });
                return [];
            }
        }
        function getDatoMasAlto(datos, trd) {
            try {
                let arrDataOpDef = [];
                var contador = 0;
                datos.map(actOp => {
                    var actual = actOp;
                    if (contador !== 0) {
                        var validacion = true
                        arrDataOpDef.map(actOpAux => {
                            if (actOpAux.id === actual.id) {
                                validacion = false;
                            }
                        })
                        arrDataOpDef.map(actOpAux => {
                            if (actOpAux.id !== actual.id && actual.id !== '' && validacion) {
                                arrDataOpDef.push(actual)
                                validacion = false
                            } else {
                                if (actOpAux.id === actual.id && actual.amount > actOpAux.amount) {
                                    actOpAux.amount = actual.amount;
                                    actOpAux.currency = actual.currency;
                                }
                            }
                        })
                    } else {
                        if (actual.id !== '') {
                            arrDataOpDef.push(actual)
                            contador++;
                        }
                    }
                })
                log.audit({ title: 'datos of ' + trd + ': ', details: arrDataOpDef });
                return arrDataOpDef;
            } catch (e) {
                log.error({ title: 'Error getDatoMasAlto:', details: e });
            }
        }
        function getDateTransaction() {
            try {
                var companyinformationObj = config.load({ type: config.Type.COMPANY_PREFERENCES });
                log.audit({ title: 'companyinformationObj', details: companyinformationObj });
                var dateFormat = companyinformationObj.getValue({ fieldId: 'DATEFORMAT' })
                log.audit({ title: 'dateFormat', details: dateFormat });
                /*
                    var preferencias = config.load({
                        type: config.Type.USER_PREFERENCES
                    });
                    log.audit({ title: 'type', details: typeof preferencias });
                    log.audit({ title: 'preferencias', details: preferencias });
                    var dateFormat= preferencias.getValue({fieldId: 'DATEFORMAT' })
                    log.audit({ title: 'preferencias', details: dateFormat });
                */
                var date = new Date()
                var fechaI = moment(date).format(dateFormat).split('/');
                var fechaF = date.setMonth(date.getMonth() - 12)
                var fechaArreglo = moment(fechaF).format(dateFormat).split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fechaI[2];
                log.audit({ title: 'fecha', details: { fechaIni: fechaInicio, fechaFin: fechaFin } });
            } catch (e) {
                log.error({ title: 'Error getDateTransaction:', details: e });
            }
        }
        /**
         * 
         * @param {params} param
         * @returns arrItemsMXNAux, arrItemsUSDAux
         * funcion para buscar, agrupar y calcular los datos para los campos de la tabla.
         */
        function searchItems(params) {
            try {
                var periodoBuscar = params.periodo;
                var claseBuscar = params.clase;
                var cambioMXN = parseFloat(params.monedaMxn);
                var cambioUSD = parseFloat(params.monedaUsd);
                var arrItemsMx = [];
                // log.audit({ title: 'claseBuscar', details: claseBuscar });
                var arrItemsMXNAux = searchItemsEnsamble(claseBuscar, periodoBuscar, cambioMXN, cambioUSD);
                log.audit({ title: 'itemsEnsamblaje', details: arrItemsMXNAux });
                log.audit({ title: 'No. items assemble:', details: arrItemsMXNAux.length });

                var arrItemsUSDAux = [];
                arrItemsMXNAux.forEach(idItem => {
                    //log.debug({ title: 'idItem', details: idItem.materialList });
                    //  if(Number(idItem.pieces) !== 0){
                    // if (!idItem.artiSub) {
                    if (Number(idItem.theoretical_margin).toFixed(3) > 0 && !idItem.artiSub) {
                    // if (!idItem.artiSub) {
                        var objAux = assignObjAux(idItem);
                        log.debug({ title: 'Moneda', details: idItem.currencyItem });
                        log.debug({ title: 'Tipo', details: typeof idItem.currencyItem });
                        if (idItem.currencyItem === "1") {
                            arrItemsMx.push(objAux)
                            // var objAux2 = assignObjAux(idItem);
                            // objAux2.listPrice = (objAux2.listPrice / cambioUSD).toFixed(3)
                            // objAux2.listPriceOr = (objAux2.listPriceOr / cambioUSD).toFixed(3)
                            // objAux2.lastCost = (objAux2.lastCost / cambioUSD).toFixed(3)
                            // objAux2.saleCost = (objAux2.saleCost / cambioUSD).toFixed(3)
                            // objAux2.currencyItem = (objAux2.currencyItem / cambioUSD).toFixed(3)
                            // objAux2.averageCost = (objAux2.averageCost / cambioUSD).toFixed(3)
                            // objAux2.inc_suggest = (objAux2.inc_suggest / cambioUSD).toFixed(3)
                            // arrItemsUSDAux.push(objAux2)
                        }
                        if (idItem.currencyItem === "2") {
                            arrItemsUSDAux.push(objAux)
                            // var objAux2 = assignObjAux(idItem);
                            // objAux2.listPrice = (objAux2.listPrice * cambioMXN).toFixed(3)
                            // objAux2.listPriceOr = (objAux2.listPriceOr * cambioMXN).toFixed(3)
                            // objAux2.lastCost = (objAux2.lastCost * cambioMXN).toFixed(3)
                            // objAux2.saleCost = (objAux2.saleCost * cambioMXN).toFixed(3)
                            // objAux2.currencyItem = (objAux2.currencyItem * cambioMXN).toFixed(3)
                            // objAux2.averageCost = (objAux2.averageCost * cambioMXN).toFixed(3)
                            // objAux2.inc_suggest = (objAux2.inc_suggest * cambioMXN).toFixed(3)
                            // arrItemsMx.push(objAux2)
                        }
                        /*arrItemsMx.push({
                            id: idItem.id,
                            itemCode: idItem.itemCode,
                            listPrice: Number((idItem.listPrice)),
                            listPriceOr: Number((idItem.listPrice)),
                            pieces: idItem.pieces,
                            lastCost: Number((idItem.lastCost)),
                            saleCost: Number((idItem.saleCost)),
                            currencyItem: idItem.currencyItem,
                            averageCost: Number((idItem.averageCost)),
                            min_margin: idItem.min_margin,
                            max_margin: idItem.max_margin,
                            real_margin: idItem.real_margin,
                            theoretical_margin: idItem.theoretical_margin,
                            inc_suggest: idItem.inc_suggest
                        })*/
                        // }
                    }
                })

                itemsFiltrar = [arrItemsMx, arrItemsUSDAux];
                log.debug({ title: 'itemsFiltrar', details: itemsFiltrar });
                return [arrItemsMx, arrItemsUSDAux];

            } catch (e) {
                log.error({ title: 'Error SearchItems: ', details: e });
                return [];
            }
        }
        function assignObjAux(idItem) {
            try {
                return {
                    id: idItem.id,
                    itemCode: idItem.itemCode,
                    listPrice: Number(idItem.listPrice).toFixed(3),
                    listPriceOr: Number(idItem.listPrice).toFixed(3),
                    pieces: idItem.pieces,
                    lastCost: Number(idItem.lastCost).toFixed(3),
                    saleCost: Number(idItem.saleCost).toFixed(3),
                    currencyItem: Number(idItem.currencyItem).toFixed(3),
                    averageCost: Number(idItem.averageCost).toFixed(3),
                    min_margin: Number(idItem.min_margin).toFixed(3),
                    max_margin: Number(idItem.max_margin).toFixed(3),
                    real_margin: Number(idItem.real_margin).toFixed(3),
                    theoretical_margin: Number(idItem.theoretical_margin).toFixed(3),
                    inc_suggest: Number(idItem.inc_suggest).toFixed(3)
                }
            } catch (e) {
                log.error({ title: 'Error assemblyitem:', details: e });
                return {}
            }
        }
        function addItemsList(form, itemsListMXN, itemsListUSD) {
            try {
                // log.audit({ title: 'itemsListMXN', details: itemsListMXN });
                var sublist = form.getSublist({ id: 'sublist_precios_mxn' });
                for (var j = 0; j < itemsListMXN.length; j++) {
                    var output = url.resolveRecord({
                        recordType: 'assemblyitem',
                        recordId: itemsListMXN[j].id,
                        isEditMode: false
                    });

                    //log.audit({ title: 'itemsList id:', details: itemsListMXN[j].id });
                    //log.audit({ title: 'itemsList:', details: itemsListMXN[j] });
                    if (itemsListMXN[j].check) {
                        sublist.setSublistValue({ id: 'sublist_valid_incrementar_mxn', line: j, value: "T" });
                    }
                    sublist.setSublistValue({ id: 'sublist_id_internal_item_mxn', line: j, value: itemsListMXN[j].id });
                    sublist.setSublistValue({ id: 'sublist_id_item_mxn', line: j, value: itemsListMXN[j].itemCode });
                    sublist.setSublistValue({ id: 'sublist_list_price_mxn', line: j, value: '$' + itemsListMXN[j].listPrice });
                    sublist.setSublistValue({ id: 'sublist_list_price_or_mxn', line: j, value: itemsListMXN[j].listPriceOr });
                    sublist.setSublistValue({ id: 'sublist_pieces_mxn', line: j, value: itemsListMXN[j].pieces });
                    sublist.setSublistValue({ id: 'sublist_last_cost_mxn', line: j, value: '$' + itemsListMXN[j].lastCost });
                    sublist.setSublistValue({ id: 'sublist_sale_price_mxn', line: j, value: '$' + itemsListMXN[j].saleCost });
                    sublist.setSublistValue({ id: 'sublist_average_cost_mxn', line: j, value: '$' + itemsListMXN[j].averageCost });
                    sublist.setSublistValue({ id: 'sublist_minimum_margin_mxn', line: j, value: itemsListMXN[j].min_margin });
                    sublist.setSublistValue({ id: 'sublist_maximum_margin_mxn', line: j, value: itemsListMXN[j].max_margin });
                    sublist.setSublistValue({ id: 'sublist_real_margin_mxn', line: j, value: itemsListMXN[j].real_margin });
                    sublist.setSublistValue({ id: 'sublist_theoretical_margin_mxn', line: j, value: itemsListMXN[j].theoretical_margin });
                    sublist.setSublistValue({ id: 'sublist_suggested_increase_mxn', line: j, value: itemsListMXN[j].inc_suggest });
                    sublist.setSublistValue({ id: 'sublist_suggested_increase_or_mxn', line: j, value: itemsListMXN[j].inc_suggest });
                    sublist.setSublistValue({ id: 'sublist_currency_mxn', line: j, value: itemsListMXN[j].currencyItem });
                }
                var sublist2 = form.getSublist({ id: 'sublist_precios_usd' });
                log.debug({ title: 'itemListUSD.length', details: itemsListUSD.length });
                for (var j = 0; j < itemsListUSD.length; j++) {
                    var output = url.resolveRecord({
                        recordType: 'assemblyitem',
                        recordId: itemsListUSD[j].id,
                        isEditMode: false
                    });
                    //log.audit({ title: 'itemsList id:', details: itemsListUSD[j].id });
                    //log.audit({ title: 'itemsList USD:', details: itemsListUSD[j] });
                    if (itemsListUSD[j].check) {
                        sublist2.setSublistValue({ id: 'sublist_valid_incrementar_usd', line: j, value: "T" });
                    }
                    sublist2.setSublistValue({ id: 'sublist_id_internal_item_usd', line: j, value: itemsListUSD[j].id });
                    // sublist2.setSublistValue({ id: 'sublist_id_item_usd', line: j, value: "<a href=" + output + ">" + itemsListUSD[j].itemCode + "</a>" });
                    sublist2.setSublistValue({ id: 'sublist_id_item_usd', line: j, value: itemsListUSD[j].itemCode });
                    sublist2.setSublistValue({ id: 'sublist_list_price_usd', line: j, value: '$' + itemsListUSD[j].listPrice });
                    sublist2.setSublistValue({ id: 'sublist_list_price_or_usd', line: j, value: itemsListUSD[j].listPriceOr });
                    sublist2.setSublistValue({ id: 'sublist_pieces_usd', line: j, value: itemsListUSD[j].pieces });
                    sublist2.setSublistValue({ id: 'sublist_last_cost_usd', line: j, value: '$' + itemsListUSD[j].lastCost });
                    sublist2.setSublistValue({ id: 'sublist_sale_price_usd', line: j, value: '$' + itemsListUSD[j].saleCost });
                    sublist2.setSublistValue({ id: 'sublist_average_cost_usd', line: j, value: '$' + itemsListUSD[j].averageCost });
                    sublist2.setSublistValue({ id: 'sublist_minimum_margin_usd', line: j, value: itemsListUSD[j].min_margin });
                    sublist2.setSublistValue({ id: 'sublist_maximum_margin_usd', line: j, value: itemsListUSD[j].max_margin });
                    sublist2.setSublistValue({ id: 'sublist_real_margin_usd', line: j, value: itemsListUSD[j].real_margin });
                    sublist2.setSublistValue({ id: 'sublist_theoretical_margin_usd', line: j, value: itemsListUSD[j].theoretical_margin });
                    sublist2.setSublistValue({ id: 'sublist_suggested_increase_usd', line: j, value: itemsListUSD[j].inc_suggest });
                    sublist2.setSublistValue({ id: 'sublist_suggested_increase_or_usd', line: j, value: itemsListUSD[j].inc_suggest });
                    sublist2.setSublistValue({ id: 'sublist_currency_usd', line: j, value: itemsListUSD[j].currencyItem });
                }
            } catch (e) {
                log.error({ title: 'Error addItemList', details: e });
            }
        }

        function markAll(form, itemsListMXN, itemsListUSD, act) {
            var sublistMxn = form.getSublist({ id: 'sublist_precios_mxn' });
            log.debug({ title: 'sublistMxn', details: itemsListMXN });
            for (var i = 0; i < itemsListMXN.length; i++) {
                sublistMxn.setSublistValue({ id: 'sublist_valid_incrementar_mxn', line: i, value: act });
            }
            var sublistUsd = form.getSublist({ id: 'sublist_precios_usd' });
            log.debug({ title: 'sublistUSD', details: itemsListUSD });
            for (var i = 0; i < itemsListUSD.length; i++) {
                sublistUsd.setSublistValue({ id: 'sublist_valid_incrementar_usd', line: i, value: act });
            }
        }
        function errForm(details) {
            try {

                var form = serverWidget.createForm({
                    title: "Formulario de captura"
                });
                var htmlfld = form.addField({
                    id: "custpage_msg_error",
                    label: " ",
                    type: serverWidget.FieldType.INLINEHTML
                });
                htmlfld.defaultValue = '<b>HA OCURRIDO UN ERROR; CONTACTE A SUS ADMINISTRADORES.</b>' +
                    '<br>Detaller:</br>' + JSON.stringify(details);
                return form;
            } catch (e) {
                log.error({ title: "error onRequest", details: e });
            }
        }
        return { onRequest }

    });
