<#macro getSite item><#if item.type='{http://www.alfresco.org/model/site/1.0}site'>${item.properties["cm:name"]}<#else><@getSite item.parent/></#if></#macro>
<#macro encodepath node><#if node.parent?exists><@encodepath node=node.parent/>/${node.name?url}</#if></#macro>
<#macro getTopic post><#if post.type='{http://www.alfresco.org/model/forum/1.0}topic'>${post.properties["cm:name"]}<#else><@getTopic post.parent/></#if></#macro>
<#macro getUrl item>
<#if item.node.displayPath?contains("documentLibrary")>
<#if item.node.type=="{http://www.alfresco.org/model/content/1.0}folder">
page/site/<@getSite item.node/>/folder-details?nodeRef=${item.node.nodeRef}
<#else>
page/site/<@getSite item.node/>/document-details?nodeRef=${item.node.nodeRef}
</#if>
<#elseif item.node.displayPath?contains("wiki")>
page/site/<@getSite item.node/>/wiki-page?title=${item.node.properties["cm:name"]?url}
<#elseif item.node.displayPath?contains("discussions")>
page/site/<@getSite item.node/>/discussions-topicview?container=discussions&topicId=<@getTopic item.node/>&listViewLinkBack=true
<#else>
.
</#if>
</#macro>
<?xml version="1.0"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
   <channel>
      <title>Recent Activities Dashlet RSS feed</title>
      <atom:link href="${absurl("/share/proxy/alfresco/sv-theme/activities?format=rss")}" rel="self" type="application/rss+xml" />
      <link>${absurl("/share/")}</link>
      <description>Recent activities RSS feed</description>
      <lastBuildDate>${date?string("EEE, dd MMMM yyyy hh:mm:ss Z")}</lastBuildDate>
      <pubDate>${date?string("EEE, dd MMMM yyyy hh:mm:ss Z")}</pubDate>
      <generator>Alfresco 1.4</generator>
      <#list results as item>
      <item>
         <title>${item.node.name}</title>
         <link>${absurl("/share/")}<@getUrl item/></link>
        <#assign modifiedBy>
		<#if item.modifier?exists>
			${item.modifier.properties["cm:firstName"]} ${item.modifier.properties["cm:lastName"]}
    	<#else>
			"${item.node.properties["cm:modifier"]}"
		</#if>
		</#assign>
         <description>${item.node.name} <#if item.commentedOn==true>${msg("text.commentedOn-by", modifiedBy)}<#else>${msg("text.modified-by", modifiedBy)} ${item.node.name} on ${item.modTime?string("EEE, dd MMMM yyyy hh:mm:ss Z")}</#if></description>
         <pubDate>${item.modTime?string("EEE, dd MMMM yyyy hh:mm:ss Z")}</pubDate>
         <guid isPermaLink="true">${absurl("/share/")}<@getUrl item/></guid>
      </item>
      </#list>
   </channel>
</rss>