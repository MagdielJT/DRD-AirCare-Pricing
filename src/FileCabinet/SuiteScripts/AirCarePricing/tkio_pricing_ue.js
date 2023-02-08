/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/dialog', 'N/ui/serverWidget', 'N/search', 'N/log', 'N/runtime', 'N/record', 'N/task', 'N/redirect'],
    /**
 * @param{log} log
 */
    (dialog, ui, search, log, runtime, record, task, redirect) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try{
            log.debug("Tipo", scriptContext.type);
            if (scriptContext.type === scriptContext.UserEventType.EDIT) {

                var newRecord =  scriptContext.newRecord;
                var id = newRecord.id;

                var sendData = sendMap(id);
                

            }
            }catch(e){
                log.error({title: 'afterSubmit', details: e});
                
            }
        }

        function sendMap(id){
            try{
                log.debug({title: 'id', details: id});
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_tkio_pricing_update_margin',
                    deploymentId: 'customdeploy_tkio_pricing_update_margin',
                    params: {
                        'custscript_tkio_filter_id_clase': JSON.stringify(id)
                    }
                });
                var idTask = mrTask.submit();
                log.audit({ title: 'idTask', details: idTask });

            }catch(e){
                log.error({title: 'SendData', details: e})
            }
        }
        return {beforeLoad, beforeSubmit, afterSubmit}

    });
