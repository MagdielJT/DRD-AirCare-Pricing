/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/task', 'N/record', 'N/runtime', 'N/search','N/format'],
    /**
 * @param{log} log
 * @param{task} task
 */
    (log, task, record, runtime, search, format) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                var objScript = runtime.getCurrentScript();
                var idClase = JSON.parse(objScript.getParameter({ name: "custscript_tkio_filter_id_clase" }));
                log.audit({title: 'idClase: ', details: idClase});

                let dataClass = search.lookupFields({ type: "classification", id: idClase, columns: ['custrecord_tkio_max_margen', 'custrecord_tkio_min_margen'] })
                log.audit({title: 'Datos clase: ', details: dataClass});

                let arr = [];
                var assemblyitemSearchObj = search.create({
                    type: "assemblyitem",
                    filters:
                        [
                            ["type", "anyof", "Assembly"], 
                            "AND", 
                            ["class","anyof", idClase]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "custitem_tkio_max_margen_art", label: "Margen Máximo" }),
                            search.createColumn({ name: "custitem_tkio_min_margen_art", label: "Margen Mínimo" })
                        ]
                });
                var searchResultCount = assemblyitemSearchObj.runPaged().count;
                log.debug("assemblyitemSearchObj result count", searchResultCount);
                assemblyitemSearchObj.run().each(function (result) {
                    arr.push({
                         id: result.getValue({ name: "internalid"}),
                         maxMargen : dataClass.custrecord_tkio_max_margen,
                         minMargen: dataClass.custrecord_tkio_min_margen
                    })
                    return true;
                });
                return arr;
            } catch (Error) {
                log.error({ title: 'Error getInputData: ', details: Error });
            }
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                mapContext.write({
                    key: mapContext.key,
                    value: mapContext.value,
                })
            } catch (err) {
                log.error({ title: 'Error map:', details: err })
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                let data = JSON.parse(reduceContext.values[0]);
                log.debug({ title: 'Datos obtenidos del UserEvent: ', details: data });
                
                var objRecord = record.load({ type: 'assemblyitem', id: data.id });
                let min_margin = format.parse({ value: data.minMargen, type: format.Type.PERCENT });
                let max_margin = format.parse({ value: data.maxMargen, type: format.Type.PERCENT });
                objRecord.setValue({ fieldId: 'custitem_tkio_max_margen_art', value: max_margin });
                objRecord.setValue({ fieldId: 'custitem_tkio_min_margen_art', value: min_margin });
                var recordId = objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
            } catch (e) {
                log.error({ title: 'Error reduce:', details: e });
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return { getInputData, map, reduce, summarize }

    });
