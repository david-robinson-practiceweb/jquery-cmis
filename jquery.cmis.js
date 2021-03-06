(function(window, $){
    var CMIS;
	
	/** 
	    Holds all our CMIS code 
	    @class 
	*/
	CMIS = {};
	
	/** 
	    Wrap a Node of type Feed or Entry
	    @class 
	    @param node XMLNode of an entry or feed
	 */
	CMIS.Node = function(node) {
		var that = this;
		
		/** The XML node wrapped. */
		this.xmlNode = node;
		
		/** The title of the feed or Entry. */
		this.title = this.xmlNode.children("title").eq(0).text();
		
		/** The properties of the feed or Entry. */
		this.properties = {};
		
		this._entry_cache_by_id = null;
		this._entries_cache = null;

		_getPropertiesNode(this.xmlNode).children().each(function(i, node) {
			that.properties[$(node).attr("propertyDefinitionId")] = $(node).find("cmis\\:value, value").text();
		});
		
		if (this.getProperty("cmis:objectId")) {
			this.id = this.getProperty("cmis:objectId");
		} else {
			this.id = this.xmlNode.children("id").text();
		}
	}
	
	/** Get the links for the current Node
	    @param {String} [rel] the relation kind of link is optional
	    @param {String} [type] the type of the link is optional
	 */
	CMIS.Node.prototype.getLinks = function(rel, type) {
		
		var selector = "link", res = [];
		if (rel !== undefined) {
			selector += "[rel=" + rel + "]";
		}
		
		if (type !== undefined) {
			selector += "[type=" + type + "]";
		}
		this.xmlNode.children(selector).each(function(i, n) {
			res.push($(n).attr("href"));
		});
		return res;
	}
	
	/**
	    Is the current Node is a feed?
	 */
	CMIS.Node.prototype.isFeed = function() {
		return this.xmlNode.is("feed");
	}
	
	/** 
	    Is the current Node is an entry?
	 */
	CMIS.Node.prototype.isEntry = function() {
		return this.xmlNode.is("entry");
	}
	
	/**
	    Is the base type of the current Node is a Folder?
	 */
	CMIS.Node.prototype.isFolder = function() {
		return this.properties["cmis:baseTypeId"] === "cmis:folder";
	}
	
	/**
	    Return a property from the current Node
	    if the property does not exist, return null
	    @param {String} key The propertyDefinitionId of the property
	 */
	CMIS.Node.prototype.getProperty = function(key) {
		return (key in this.properties ? this.properties[key] : null);
	}
	
	/**
	    Return the parent ID from the current Node
	    if the Node has no parent, return null
	 */
	CMIS.Node.prototype.getParentId = function() {
		return this.getProperty("cmis:parentId");
	}
	
	/**
	    Return all the entries in a feed
	 */
	CMIS.Node.prototype.getEntries = function() {
		var that = this;
		if (!this.isFeed()) {
			return [];
		}
		
		if (this._entries_cache === null) {
			this._entries_cache = [];
			this.xmlNode.children("entry").each(function(i, node) {
				that._entries_cache.push(new CMIS.Node($(node)));
			});
			this._entries_cache = $(this._entries_cache);
		}
		
		return this._entries_cache;
	}


    /**
        Return the URL of the content
        this is only useful if the node is an entry
     */
	CMIS.Node.prototype.getContentUrl = function() {
		return this.xmlNode.children("content").attr("src");
	}
	
	/**
	    Return the entry of a given ID from a feed
	    @param {String} id The id of a document (cmis:objectId if available)
	 */
	CMIS.Node.prototype.getEntry = function(id) {
		if (!this.isFeed()) {
			return null;
		}
		if (this._entry_cache_by_id === null) {
			var that = this;
			this._entry_cache_by_id = {};
			this.getEntries().each(function(i, entry) {
				that._entry_cache_by_id[entry.id] = entry;
			});
		}
		return id in this._entry_cache_by_id ? this._entry_cache_by_id[id] : null;
	}

    /**
	    Wrap a Workspace node
	    @class
	    @param node XMLNode of a Workspace
	 */
	CMIS.Workspace = function(node) {
	    var that = this;
	    
	    /** The XML node wrapped. */
	    this.xmlNode = node;
	    
	    /** The title of the workspace. */
		this.title = this.xmlNode.children("title").eq(0).text();
		
		/** The link to collections indexed by collection type. */
		this.collections = {};
		this.xmlNode.children("collection").each(function(i, col) {
		    that.collections[$(col).find("cmisra\\:collectionType, collectionType").eq(0).text()] = $(col).attr("href");
		});
	};
    
    /** The name of the vendor of this workspace */
    CMIS.Node.prototype.getVendorName = function() {
        return this.xmlNode.find("cmis\\:vendorName, vendorName").text()    
    }

	/** Get the links for the Workspace
	 	@function 
	    @param {String} [rel] the relation kind of link is optional.
	    @param {String} [type] the type of the link is optional.
	 */
	CMIS.Workspace.prototype.getLinks = CMIS.Node.prototype.getLinks;
	
	/**
	    Is this is a workspace?
	 */
	CMIS.Workspace.prototype.isWorkspace = function(){return true};



	/**
	    Parse a feed or an entry
	    @param {Document} xml the relation kind of link is optional.
	    @returns {CMIS.Node|CMIS.Workspace[]} CMIS.Node or an array of CMIS.Workspace .
	 */
	CMIS.parse = function(xml) {
		if ($(xml).children("feed").length > 0) {
			return new CMIS.Node($(xml).children("feed").eq(0));
		} else if ($(xml).children("service").length > 0) {
		    var res = [];
		    $(xml).children("service").children("workspace").each(function(i, workspace) {
		        res.push(new CMIS.Workspace($(workspace)));
		    });
		    
		    return res;
		}
		return new CMIS.Node($(xml).children("entry").eq(0));
	}

	window.CMIS = CMIS;
	
	
	
	/*
	 * Helper function
	 */
	var _getPropertiesNode = function(node) {
		// this doesn't work due to the namespace, so we use another way arround
		// var props = node.children("cmisra\\:object > cmis\\:properties");
		var res = null;
		propsNodes = $(node).find("cmis\\:properties, properties").each(function(i, propsNode) {
			if ($(propsNode).parent().parent()[0] === $(node)[0]) {
				res = $(propsNode);
				return false;
			}
		});
		return res || $();
	};
})(window, jQuery);
