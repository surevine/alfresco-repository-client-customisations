<import resource="classpath:/alfresco/templates/webscripts/org/alfresco/slingshot/documentlibrary/action/action.lib.js">

/**
 * Safe move multiple files action
 * @method POST
 */

/**
 * Entrypoint required by action.lib.js
 *
 * @method runAction
 * @param p_params {object} Object literal containing files array
 * @return {object|null} object representation of action results
 */
function runAction(p_params)
{
   var results = [],
      destNode = p_params.destNode,
      files = p_params.files,
      file, fileNode, result, nodeRef;

   // Must have array of files
   if (!files || files.length === 0)
   {
      status.setCode(status.STATUS_BAD_REQUEST, "No files.");
      return;
   }

   for (file in files)
   {
      nodeRef = files[file];
      result =
      {
         action: "safeMoveFile",
         success: false
      };
      
      try {
    	  
    	fileNode = search.findNode(nodeRef);
    	
      	result.id = fileNode.name;
      	result.type = (fileNode.getTypeShort() == "cm:folder" ? "folder" : "file");
      	
      	var action = actions.create("com.surevine.alfresco.repo.action.MoveAsSuperuserAction");
      	action.parameters.destination = destNode.getNodeRef();
      	action.execute(search.findNode(nodeRef));
      	
      	result.previousNodeRef = nodeRef,
        result.nodeRef = action.parameters.result,
      	result.success = true;
      	
      }
      catch (e)
      {
          result.id = file;
          result.nodeRef = nodeRef;
          result.success = false;
      }

      results.push(result);
   }

   return results;
}

/* Bootstrap action script */
main();
