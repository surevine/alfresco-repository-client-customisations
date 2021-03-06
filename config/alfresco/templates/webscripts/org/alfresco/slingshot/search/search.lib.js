/*
 * Copyright (C) 2008-2010 Surevine Limited.
 *   
 * Although intended for deployment and use alongside Alfresco this module should
 * be considered 'Not a Contribution' as defined in Alfresco'sstandard contribution agreement, see
 * http://www.alfresco.org/resource/AlfrescoContributionAgreementv2.pdf
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/
const DEFAULT_MAX_RESULTS = 250;
const SITES_SPACE_QNAME_PATH = "/app:company_home/st:sites/";
const USERS_QNAME_PATH = "/sys:system/sys:people/";
const NOT_USER_QNAME_PATH_FRAGMENT = "/app:configurations/app:preferences";
const DISCUSSION_QNAMEPATH = "/fm:discussion";
const COMMENT_QNAMEPATH = DISCUSSION_QNAMEPATH + "/cm:Comments/";
const QUERY_TEMPLATES = [
   {field: "keywords", template: "%(cm:name cm:title cm:description ia:whatEvent ia:descriptionEvent " +
	   "lnk:title lnk:description up:biography up:askMeAbouts up:telephoneNumbers cm:userName cm:firstName " +
	   "cm:lastName cm:email TEXT TAG)"}];

/**
 * Returns site information data structure. { shortName: siteId, title: title }
 * 
 * Caches the data to avoid repeatedly querying the repository.
 */
var siteDataCache = {};
function getSiteData(siteId)
{
   if (typeof siteDataCache[siteId] === "object")
   {
      return siteDataCache[siteId];
   }
   var site = siteService.getSite(siteId);
   var data =
   {
      shortName : siteId,
      title : (site !== null ? site.title : "unknown")
   };
   siteDataCache[siteId] = data;
   return data;
}

/**
 * Returns person display name string as returned to the user.
 * 
 * Caches the person full name to avoid repeatedly querying the repository.
 */
var personDataCache = {};
function getPersonDisplayName(userId)
{
   if (typeof personDataCache[userId] === "object")
   {
      return personDataCache[userId];
   }
   
   var displayName = "";
   var person = people.getPerson(userId);
   if (person != null)
   {
      displayName = person.properties.firstName + " " + person.properties.lastName;
   }
   personDataCache[userId] = displayName;
   return displayName;
}

/**
 * Cache to not display twice the same element (e.g. if two comments of the same
 * blog post match the search criteria
 */
var processedCache = {};
function checkProcessedCache(key)
{
   var found = processedCache.hasOwnProperty(key);
   if (!found)
   {
      processedCache[key] = true;
   }
   else if (found && logger.isLoggingEnabled())
      logger.log("...already processed item with key: " + key);
   return found;
}

/**
 * Returns an item outside of a site in the main repository.
 */
function getRepositoryItem(folderPath, node)
{
   // check whether we already processed this §
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   // check whether this is a valid folder or a file
   var item = t = null;
   if (node.qnamePath.indexOf(COMMENT_QNAMEPATH) == -1 &&
       !(node.qnamePath.match(DISCUSSION_QNAMEPATH+"$") == DISCUSSION_QNAMEPATH))
   {
      if (node.isContainer || node.isDocument)
      {
         item =
         {
            nodeRef: node.nodeRef.toString(),
            tags: ((t = node.tags) !== null) ? t : [],
            name: node.name,
            displayName: node.name,
            title: node.properties["cm:title"],
            description: node.properties["cm:description"],
            modifiedOn: node.properties["cm:modified"],
            modifiedByUser: node.properties["cm:modifier"],
            createdOn: node.properties["cm:created"],
            createdByUser: node.properties["cm:creator"],
            path: folderPath.join("/")
         };
         item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
         item.createdBy = getPersonDisplayName(item.createdByUser);
      }
      if (node.isContainer)
      {
         item.type = "folder";
         item.size = -1;
      }
      else if (node.isDocument)
      {
         item.type = "document";
         item.size = node.size;
      }
   }
   
   return item;
}

/**
 * Returns an item of the document library component.
 */
function getDocumentItem(siteId, containerId, pathParts, node)
{
   if (node.type == "{http://www.alfresco.org/model/forum/1.0}post") // If
																		// we've
																		// matched
																		// a
																		// comment...
   {
	   return getDocumentItem(siteId, containerId, pathParts, node.parent.parent.parent); // ...
																							// then
																							// instead
																							// of
																							// returning
																							// info
																							// on
																							// this
																							// comment,
																							// return
																							// the
																							// parent
																							// document
   }

   
   // check whether we already processed this document
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   // check whether this is a valid folder or a file
   var item = t = null;
   
   // INT-334 - This condition was changed in 3.4 to disallow both comments and
	// discussion folders, however we want comments so that condition has been
   // restricted to discussion folders only.
   if (!(node.qnamePath.match(DISCUSSION_QNAMEPATH+"$") == DISCUSSION_QNAMEPATH))
   {
      if (node.isContainer || node.isDocument)
      {
         item =
         {
            site: getSiteData(siteId),
            container: containerId,
            nodeRef: node.nodeRef.toString(),
            tags: ((t = node.tags) !== null) ? t : [],
            name: node.name,
            displayName: node.name,
            title: node.properties["cm:title"],
            description: node.properties["cm:description"],
            modifiedOn: node.properties["cm:modified"],
            modifiedByUser: node.properties["cm:modifier"],
            createdOn: node.properties["cm:created"],
            createdByUser: node.properties["cm:creator"],
            path: pathParts.join("/").replace('/'+node.name+' discussion/Comments', '').replace(node.name, '') // Adjust comment path to link to parent document's location
         };
         item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
         item.createdBy = getPersonDisplayName(item.createdByUser);
      }
      if (node.isContainer)
      {
         item.type = "folder";
         item.size = -1;
      }
      else if (node.isDocument)
      {
         item.type = "document";
         item.size = node.size;
      }
      
      item = addManagedDeleteDataToItem(item, node);
      
   }
   
   return item;
}

function getBlogPostItem(siteId, containerId, pathParts, node)
{
   /**
	 * Investigate the rest of the path. the first item is the blog post, ignore
	 * everything that follows are replies or folders
	 */
   var site = siteService.getSite(siteId);
   var container = site.getContainer(containerId);
   
   /**
	 * Find the direct child of the container Note: this only works for post
	 * which are direct children of the blog container
	 */
   var child = node;
   var parent = child.parent;
   while ((parent !== null) && (!parent.nodeRef.equals(container.nodeRef)))
   {
      child = parent;
      parent = parent.parent;
   }
   
   // check whether we found the container
   if (parent === null)
   {
      return null;
   }
   
   // check whether we already added this blog post
   if (checkProcessedCache("" + child.nodeRef.toString()))
   {
      return null;
   }
   
   // child is our blog post
   var item, t = null;
   item =
   {
      site: getSiteData(siteId),
      container: containerId,
      nodeRef: child.nodeRef.toString(),
      type: "blogpost",
      tags: ((t = child.tags) !== null) ? t : [],
      name: child.name,
      modifiedOn: child.properties["cm:modified"],
      modifiedByUser: child.properties["cm:modifier"],
      createdOn: node.properties["cm:created"],
      createdByUser: node.properties["cm:creator"],
      size: child.size,
      displayName: child.properties["cm:title"]
   };
   item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
   item.createdBy = getPersonDisplayName(item.createdByUser);
   
   return item;
}

function getForumPostItem(siteId, containerId, pathParts, node)
{
   // try to find the first fm:topic node, that's what we return as search
	// result
   var topicNode = node;
   while ((topicNode !== null) && (topicNode.type != "{http://www.alfresco.org/model/forum/1.0}topic"))
   {
      topicNode = topicNode.parent;
   }
   if (topicNode === null)
   {
      return null;
   }
   
   // make sure we haven't already added the post
   if (checkProcessedCache("" + topicNode.nodeRef.toString()))
   {
      return null;
   }
   
   // find the first post, which contains the post title
   // PENDING: error prone
   var postNode = topicNode.childAssocs["cm:contains"][0];

   // child is our forum post
   var item = t = null;
   item =
   {
      site: getSiteData(siteId),
      container: containerId,
      nodeRef: topicNode.nodeRef.toString(),
      type: "forumpost",
      tags: ((t = topicNode.tags) !== null) ? t : [],
      name: topicNode.name,
      description: topicNode.properties["cm:description"],
      modifiedOn: topicNode.properties["cm:modified"],
      modifiedByUser: topicNode.properties["cm:modifier"],
      createdOn: node.properties["cm:created"],
      createdByUser: node.properties["cm:creator"],
      size: topicNode.size,
      displayName: postNode.properties["cm:title"]
   };
   item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
   item.createdBy = getPersonDisplayName(item.createdByUser);

   item = addManagedDeleteDataToItem(item, topicNode);
   
   return item;
}

function getCalendarItem(siteId, containerId, pathParts, node)
{
   // only process nodes of the correct type
   if (node.type != "{http://www.alfresco.org/model/calendar}calendarEvent")
   {
      return null;
   }
   
   // make sure we haven't already added the event
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   var item, t = null;
   item =
   {
      site: getSiteData(siteId),
      container: containerId,
      nodeRef: node.nodeRef.toString(),
      type: "calendarevent",
      tags: ((t = node.tags) !== null) ? t : [],
      name: node.name,
      description: node.properties["ia:descriptionEvent"],
      modifiedOn: node.properties["cm:modified"],
      modifiedByUser: node.properties["cm:modifier"],
      createdOn: node.properties["cm:created"],
      createdByUser: node.properties["cm:creator"],
      size: -1,
      displayName: node.properties["ia:whatEvent"]
   };
   item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
   item.createdBy = getPersonDisplayName(item.createdByUser);
      
   return item;
}

function getWikiItem(siteId, containerId, pathParts, node)
{
   // only process documents
   if (!node.isDocument)
   {
      return null;
   }
   
   // make sure we haven't already added the page
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   var item, t = null;
   item =
   {
      site: getSiteData(siteId),
      container: containerId,
      nodeRef: node.nodeRef.toString(),
      type: "wikipage",
      tags: ((t = node.tags) !== null) ? t : [],
      name: node.name,
      description: node.properties["cm:description"],
      modifiedOn: node.properties["cm:modified"],
      modifiedByUser: node.properties["cm:modifier"],
      createdOn: node.properties["cm:created"],
      createdByUser: node.properties["cm:creator"],
      size: node.size,
      displayName: ("" + node.name).replace(/_/g, " ")
   };
   item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
   item.createdBy = getPersonDisplayName(item.createdByUser);

   item = addManagedDeleteDataToItem( item, node);

   return item;
}


function addManagedDeleteDataToItem(item, node)
{
   // add Managed Delete data to item if applicable:
   if( null !== node.properties['md:archivalDue'] ) {
 	  // this node has an archivalDue date, which implies that it is marked
		// for delete:
 	  item.isMarkedForDelete = "yes";
 	  item.archiveDueDate = node.properties['md:archivalDue'];
 	  item.markedForDeleteBy = node.properties['md:deletedBy'];
   } else {
 	  item.isMarkedForDelete = "no";    	  
   }
   
   // add Perish data to item
   if( null !== node.properties['md:perishDue'] ) {
	   
	   item.isMarkedAsPerishable = "yes";
	   
	   item.perishDue = node.properties["md:perishDue"];
	   item.perishRequestedBy = node.properties["md:perishRequestedBy"];
	   item.perishReason = node.properties["md:perishReason"];
	   
	   var perishReason = managedDeletion.getPerishReason(node.properties["md:perishReason"]);
	   
	   if( perishReason != null ) {  
		   item.perishTitle = perishReason.title;
		   item.perishDescription = perishReason.description;
	   }
   }
   else {
	   item.isMarkedAsPerishable = "no";
   }
   
   item.archivalStatus = managedDeletion.getArchivalDetails(node);

   return item;
}


function getLinkItem(siteId, containerId, pathParts, node)
{
   // only process documents
   if (!node.isDocument)
   {
      return null;
   }
   
   // make sure we haven't already added this link
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   var item = t = null;
   if (node.qnamePath.indexOf(COMMENT_QNAMEPATH) == -1 &&
       !(node.qnamePath.match(DISCUSSION_QNAMEPATH+"$") == DISCUSSION_QNAMEPATH))
   {
      item =
      {
         site: getSiteData(siteId),
         container: containerId,
         nodeRef: node.nodeRef.toString(),
         type: "link",
         tags: ((t = node.tags) !== null) ? t : [],
         name: node.name,
         description: node.properties["cm:description"],
         modifiedOn: node.properties["cm:modified"],
         modifiedByUser: node.properties["cm:modifier"],
         createdOn: node.properties["cm:created"],
         createdByUser: node.properties["cm:creator"],
         size: -1,
         displayName: node.properties["lnk:title"]
      };
      item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
      item.createdBy = getPersonDisplayName(item.createdByUser);
   }
   
   return item;
}

function getDataItem(siteId, containerId, pathParts, node)
{
   // make sure we haven't already added this item
   if (checkProcessedCache("" + node.nodeRef.toString()))
   {
      return null;
   }
   
   var item = null;
   
   // data item can be either ba containing dl:dataList or any dl:dataListItem
	// subtype
   if (node.type == "{http://www.alfresco.org/model/datalist/1.0}dataList")
   {
      // found a data list
      item =
      {
         site: getSiteData(siteId),
         container: containerId,
         nodeRef: node.nodeRef.toString(),
         type: "datalist",
         tags: [],
         name: node.name,
         description: node.properties["cm:description"],
         modifiedOn: node.properties["cm:modified"],
         modifiedByUser: node.properties["cm:modifier"],
         createdOn: node.properties["cm:created"],
         createdByUser: node.properties["cm:creator"],
         size: -1,
         displayName: node.properties["cm:title"]
      };
      item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
      item.createdBy = getPersonDisplayName(item.createdByUser);
   }
   else if (node.isSubType("{http://www.alfresco.org/model/datalist/1.0}dataListItem"))
   {
      // found a data list item
      item =
      {
         site: getSiteData(siteId),
         container: containerId,
         nodeRef: node.nodeRef.toString(),
         type: "datalistitem",
         tags: [],
         name: node.parent.name,    // used to generate link to parent datalist
									// - not ideal
         modifiedOn: node.properties["cm:modified"],
         modifiedByUser: node.properties["cm:modifier"],
         createdOn: node.properties["cm:created"],
         createdByUser: node.properties["cm:creator"],
         size: -1,
         displayName: node.name     // unfortunately does not have a common
									// display name property
      };
      item.modifiedBy = getPersonDisplayName(item.modifiedByUser);
      item.createdBy = getPersonDisplayName(item.createdByUser);
   }
   
   return item;
}

/**
 * Delegates the extraction to the correct extraction function depending on
 * containerId.
 */
function getItem(siteId, containerId, pathParts, node)
{
   var item = null;
   if (siteId == null)
   {
      item = getRepositoryItem(pathParts, node);
   }
   else
   {
      switch ("" + containerId)
      {
         case "documentLibrary":
            item = getDocumentItem(siteId, containerId, pathParts, node);
            break;
         case "blog":
            item = getBlogPostItem(siteId, containerId, pathParts, node);
            break;
         case "discussions":
            item = getForumPostItem(siteId, containerId, pathParts, node);
            break;
         case "calendar":
            item = getCalendarItem(siteId, containerId, pathParts, node);
            break;
         case "wiki":
            item = getWikiItem(siteId, containerId, pathParts, node);
            break;
         case "links":
            item = getLinkItem(siteId, containerId, pathParts, node);
            break;
         case "dataLists":
            item = getDataItem(siteId, containerId, pathParts, node);
            break;
      }
   }
   return item;
}

/**
 * Splits the qname path to a node.
 * 
 * Returns an array with: [0] = site [1] = container or null if the node does
 * not match [2] = remaining part of the cm:name based path to the object - as
 * an array
 */
function splitQNamePath(node)
{
   var path = node.qnamePath,
       displayPath = node.displayPath.split("/"),
       parts = null;
   
   if (path.match("^"+SITES_SPACE_QNAME_PATH) == SITES_SPACE_QNAME_PATH)
   {
      var tmp = path.substring(SITES_SPACE_QNAME_PATH.length),
          pos = tmp.indexOf('/');
      if (pos >= 1)
      {
         // site id is the cm:name for the site - we cannot use the encoded
			// QName version
         var siteId = displayPath[3];
         tmp = tmp.substring(pos + 1);
         pos = tmp.indexOf('/');
         if (pos >= 1)
         {
            // strip container id from the path
            var containerId = tmp.substring(0, pos);
            containerId = containerId.substring(containerId.indexOf(":") + 1);
            
            parts = [ siteId, containerId, displayPath.slice(5, displayPath.length) ];
         }
      }
   }
   
   return (parts !== null ? parts : [ null, null, displayPath ]);
}

/**
 * Processes the search results. Filters out unnecessary nodes
 * 
 * @return the final search results object
 */
function processResults(nodes, maxResults)
{    
   var results = [],
      added = 0,
      parts,
      item,
      failed = 0,
      i, j;
   
   if (logger.isLoggingEnabled())
      logger.log("Processing resultset of length: " + nodes.length);
   
   for (i = 0, j = nodes.length; i < j && added < maxResults; i++)
   {
	   try
	   {
		  if (qNamelooksLikeAvatar(nodes[i])) { //If it looks like we've found an avatar, instead use the person the avatar is for
			  logger.log("Processing avatar");
			  item = getPerson(nodes[i].parent);
			  results.push(item);
			  added++;
		  }
		  else if (qNameLooksLikePerson(nodes[i])) // Use unusual processing for people
		  {
			  logger.log("Processing person");
			  item = getPerson(nodes[i]);
			  results.push(item);
			  added++;
		  } else {
		      /**
				 * For each non-person node we extract the site/container qname path
				 * and then let the per-container helper function decide what to do.
				 */
		     parts = splitQNamePath(nodes[i]);
	         item = getItem(parts[0], parts[1], parts[2], nodes[i]);
	         if (item !== null && item.site.title!='unknown') //simonw - changed to stop items in MD sites from appearing if user owns the item
	         {
	            results.push(item);
	            added++;
	         }
		         
		     else
		     {
		         failed++;
		     }
		  }
	   } catch (e) {
		   // Something went wrong. We're not going to worry too much - just log it and skip the record!
		   failed++;
		   
		   if (logger.isLoggingEnabled())
			   logger.log("Exception encountered while filtering search results: " + e);
	   }
   }
   
   if (logger.isLoggingEnabled())
      logger.log("Filtered resultset to length: " + results.length + ". Discarded item count: " + failed);
   
   return (
   {
      items: results
   });
}

function qNameLooksLikePerson(node)
{
	return (node.qnamePath.indexOf(USERS_QNAME_PATH)!=-1 && node.qnamePath.indexOf(NOT_USER_QNAME_PATH_FRAGMENT)==-1);
}

function qNamelooksLikeAvatar(node) {
	return qNameLooksLikePerson(node) && qNameLooksLikePerson(node.parent)
}

function getPerson(personNode)
{
	logger.log("Person username: "+personNode.properties['cm:userName']);
	logger.log("Person bio: "+personNode.properties['up:biography']);
	
	var avatar=null;
	var avatars = personNode.assocs["cm:avatar"];
	if (avatars && avatars[0]) {
		avatar=avatars[0].nodeRef.toString();
	}
	
	// Don't need to use the addToProcessed cache as we'll only ever return a
	// user once
	// (if we ever add child nodes to a user we will need to revisit this)
	var item =
			   {
			      site: null,
			      container: null,
			      nodeRef: personNode.nodeRef.toString(),
			      type: "person",
			      tags: null,
			      name: personNode.name,
			      modifiedOn: null,
			      modifiedByUser: null,
			      createdOn: null,
			      createdByUser: null,
			      size: null,
			      displayName: personNode.properties['cm:firstName']+' '+personNode.properties['cm:lastName']+' ('+personNode.properties['cm:userName']+')',
			      userName: personNode.properties['cm:userName'],
			      firstName: personNode.properties['cm:firstName'],
			      lastName: personNode.properties['cm:lastName'],
			      biography: sanitiser.sanitise(personNode.properties['up:biography']),
			      avatar: avatar
			   };
	return item;
}

/**
 * Helper to escape the QName string so it is valid inside an fts-alfresco
 * query. The language supports the SQL92 identifier standard.
 * 
 * @param qname
 *            The QName string to escape
 * @return escaped string
 */
function escapeQName(qname)
{
   var separator = qname.indexOf(':'),
       namespace = qname.substring(0, separator),
       localname = qname.substring(separator + 1);

   return escapeString(namespace) + ':' + escapeString(localname);
}

function escapeString(value)
{
   var result = "";

   for (var i=0,c; i<value.length; i++)
   {
      c = value.charAt(i);
      if (i == 0)
      {
         if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_'))
         {
            result += '\\';
         }
      }
      else
      {
         if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$' || c == '#'))
         {
            result += '\\';
         }
      }
      result += c;
   }
   return result;
}

/**
 * Return Search results with the given search terms.
 * 
 * "or" is the default operator, AND and NOT are also supported - as is any
 * other valid fts-alfresco elements such as "quoted terms" and (bracket terms)
 * and also propname:propvalue syntax.
 * 
 * @param params
 *            Object containing search parameters - see API description above
 */
function getSearchResults(params)
{
   var nodes,
      ftsQuery = "",
      term = params.term.replace("-","?"),
      tag = params.tag,
      formData = params.query;
   
   // Simple keyword search and tag specific search
   if (term !== null && term.length !== 0)
   {
	  // TAG is now part of the default macro
      ftsQuery = term + " ";
   }
   else if (tag !== null && tag.length !== 0)
   {
	  // Just look for tag
      ftsQuery = "TAG:" + tag +" ";
   }
   
   // Advanced search form data search.
   // Supplied as json in the standard Alfresco Forms data structure:
   // prop_<name>:value|assoc_<name>:value
   // name = namespace_propertyname|pseudopropertyname
   // value = string value - comma separated for multi-value, no escaping yet!
   // - underscore represents colon character in name
   // - pseudo property is one of any cm:content url property:
	// mimetype|encoding|size
   // - always string values - interogate DD for type data
   if (formData !== null && formData.length !== 0)
   {
      var formQuery = "",
          formJson = jsonUtils.toObject(formData);
      
      // extract form data and generate search query
      var first = true;
      for (var p in formJson)
      {
         // retrieve value and check there is someting to search for
         // currently all values are returned as strings
         var propValue = formJson[p];
         if (propValue.length !== 0)
         {
            if (p.indexOf("prop_") === 0)
            {
               // found a property - is it namespace_propertyname or pseudo
				// property format?
               var propName = p.substr(5);
               if (propName.indexOf("_") !== -1)
               {
                  // property name - convert to DD property name format
                  propName = propName.replace("_", ":");
                  
                  // special case for range packed properties
                  if (propName.match("-range$") == "-range")
                  {
                     // currently support text based ranges (usually numbers)
						// or date ranges
                     // range value is packed with a | character separator
                     
                     // if neither value is specified then there is no need
						// to add the term
                     if (propValue.length > 1)
                     {
                        var from, to, sepindex = propValue.indexOf("|");
                        if (propName.match("-date-range$") == "-date-range")
                        {
                           // date range found
                           propName = propName.substr(0, propName.length - "-date-range".length)
                           
                           // work out if "from" and/or "to" are specified -
							// use MIN and MAX otherwise;
                           // we only want the "YYYY-MM-DD" part of the ISO
							// date value - so crop the strings
                           from = (sepindex === 0 ? "MIN" : propValue.substr(0, 10));
                           to = (sepindex === propValue.length - 1 ? "MAX" : propValue.substr(sepindex + 1, sepindex + 10));
                        }
                        else
                        {
                           // simple range found
                           propName = propName.substr(0, propName.length - "-range".length);
                           
                           // work out if "min" and/or "max" are specified -
							// use MIN and MAX otherwise
                           from = (sepindex === 0 ? "MIN" : propValue.substr(0, sepindex));
                           to = (sepindex === propValue.length - 1 ? "MAX" : propValue.substr(sepindex + 1));
                        }
                        formQuery += (first ? '' : ' AND ') + escapeQName(propName) + ':"' + from + '".."' + to + '"';
                     }
                  }
                  else
                  {
                     formQuery += (first ? '' : ' AND ') + escapeQName(propName) + ':"' + propValue + '"';
                  }
               }
               else
               {
                  // pseudo cm:content property - e.g. mimetype, size or
					// encoding
                  formQuery += (first ? '' : ' AND ') + 'cm:content.' + propName + ':"' + propValue + '"';
               }
               first = false;
            }
         }
      }
      
      if (formQuery.length !== 0 || ftsQuery.length !== 0)
      {
         // extract data type for this search - advanced search query is type
			// specific
         ftsQuery = 'TYPE:"' + formJson.datatype + '"' +
                    (formQuery.length !== 0 ? ' AND (' + formQuery + ')' : '') +
                    (ftsQuery.length !== 0 ? ' AND (' + ftsQuery + ')' : '');
      }
   }
   
   if (ftsQuery.length !== 0)
   {
      // ensure a TYPE is specified - if no add one to remove system objects
		// from result sets
      if (ftsQuery.indexOf("TYPE:\"") === -1 && ftsQuery.indexOf("TYPE:'") === -1)
      {
         ftsQuery += ' AND (+TYPE:"cm:content" +TYPE:"cm:folder" +TYPE:"cm:person")';
      }
      
      // we processed the search terms, so suffix the PATH query
      var path = null;
      
      // For security we won't allow full repository searches
// if (!params.repo)
// {
         path = SITES_SPACE_QNAME_PATH;
         if (params.siteId !== null && params.siteId.length > 0)
         {
            path += "cm:" + search.ISO9075Encode(params.siteId) + "/";
         }
         else
         {
            path += "*/";
         }
         if (params.containerId !== null && params.containerId.length > 0)
         {
            path += "cm:" + search.ISO9075Encode(params.containerId) + "/";
         }
         else
         {
            path += "*/";
         }
// }
      
      if (path != null)
      {
         ftsQuery = '(PATH:"' + USERS_QNAME_PATH + '/*" OR PATH:"' + path + '/*") AND ' + ftsQuery;
      }
      ftsQuery = '(' + ftsQuery + ') AND -TYPE:"cm:thumbnail"';
      
      ftsQuery = '(' + ftsQuery + ') AND NOT ASPECT:"sys:hidden"';

      // sort field - expecting field to in one of the following formats:
      // - short QName form such as: cm:name
      // - pseudo cm:content field starting with "." such as: .size
      // - any other directly supported search field such as: TYPE
      var sortColumns = [];
      var sort = params.sort;
      if (sort != null && sort.length != 0)
      {
         var asc = true;
         var separator = sort.indexOf("|");
         if (separator != -1)
         {
            asc = (sort.substring(separator + 1) == "true");
            sort = sort.substring(0, separator);
         }
         var column;
         if (sort.charAt(0) == '.')
         {
            // handle pseudo cm:content fields
            column = "@{http://www.alfresco.org/model/content/1.0}content" + sort;
         }
         else if (sort.indexOf(":") != -1)
         {
            // handle attribute field sort
            column = "@" + utils.longQName(sort);
         }
         else
         {
            // other sort types e.g. TYPE
            column = sort;
         }
         sortColumns.push(
         {
            column: column,
            ascending: asc
         });
      }
      
      if (logger.isLoggingEnabled())
         logger.log("Query:\r\n" + ftsQuery + "\r\nSortby: " + (sort != null ? sort : ""));
      
      // perform fts-alfresco language query
      var queryDef = {
         query: ftsQuery,
         language: "fts-alfresco",
         page: {maxItems: params.maxResults * 2},    // allow for space for
														// filtering out results
         templates: QUERY_TEMPLATES,
         defaultField: "keywords",
         onerror: "no-results",
         sort: sortColumns 
      };
      nodes = search.query(queryDef);
   }
   else
   {
      // failed to process the search string - empty list returned
      nodes = [];
   }
   
   return processResults(nodes, params.maxResults);
}
