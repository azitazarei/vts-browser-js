
import BBox_ from '../renderer/bbox';
import {utils as utils_} from '../utils/utils';

//get rid of compiler mess
var BBox = BBox_;
var utils = utils_;


var MapGeodata = function(map, url, extraInfo) {
    this.map = map;
    this.stats = map.stats;
    this.mapLoaderUrl  = url;
    this.extraInfo = extraInfo;

    this.bbox = new BBox();
    this.size = 0;
    this.fileSize = 0;
    this.geodata = null;

    this.cacheItem = null;

    this.loadState = 0;
    this.loadErrorTime = null;
    this.loadErrorCounter = 0;

    this.map.markDirty();
};


MapGeodata.prototype.kill = function() {
    this.bbox = null;
    this.killGeodata();
};


MapGeodata.prototype.killGeodata = function(killedByCache) {
    if (this.geodata) {
        this.geodata = null;
    }
    
    if (killedByCache !== true && this.cacheItem != null) {
        this.map.resourcesCache.remove(this.cacheItem);
    }

    //if (this.gpuSubmeshes.length == 0) {
    this.loadState = 0;
    //}

    this.size = 0;
    this.fileSize = 0;
    this.cacheItem = null;
};


MapGeodata.prototype.isReady = function(doNotLoad, priority) {
    var doNotUseGpu = (this.map.stats.gpuRenderUsed >= this.map.maxGpuUsed);
    doNotLoad = doNotLoad || doNotUseGpu;

    if (this.loadState == 2) { //loaded
        this.map.resourcesCache.updateItem(this.cacheItem);
        return true;
    } else {
        if (this.loadState == 0) { 
            if (doNotLoad) {
                //remove from queue
                //if (this.mapLoaderUrl) {
                  //  this.map.loader.remove(this.mapLoaderUrl);
                //}
            } else {
                //not loaded
                //add to loading queue or top position in queue


                if (typeof this.mapLoaderUrl === 'object') { //use geodata directly
                    this.geodata = JSON.stringify(this.mapLoaderUrl);
                    this.loadState = 2;
                    this.cacheItem = this.map.resourcesCache.insert(this.killGeodata.bind(this, true), this.geodata.length);
                    this.map.resourcesCache.updateItem(this.cacheItem);
                    return true;
                } else {
                    this.scheduleLoad(priority);
                }
            }
        } else if (this.loadState == 3) { //loadError
            if (this.loadErrorCounter <= this.map.config.mapLoadErrorMaxRetryCount &&
                performance.now() > this.loadErrorTime + this.map.config.mapLoadErrorRetryTime) {

                this.scheduleLoad(priority);                    
            }
        }  //else load in progress
    }

    return false;
};


MapGeodata.prototype.scheduleLoad = function(priority) {
    //if (this.mapLoaderUrl == null) {
        //this.mapLoaderUrl = this.map.url.makeUrl(this.tile.surface.meshUrl, {lod:this.tile.id[0], ix:this.tile.id[1], iy:this.tile.id[2] });
    //}

    this.map.loader.load(this.mapLoaderUrl, this.onLoad.bind(this), priority, this.extraInfo.tile, 'geodata');
};


MapGeodata.prototype.onLoad = function(url, onLoaded, onError) {
    this.mapLoaderCallLoaded = onLoaded;
    this.mapLoaderCallError = onError;

    //MapGeodataProcessor = function(surface, listener)

    this.loadState = 1;
    
    utils.loadJSON(url, this.onLoaded.bind(this), this.onLoadError.bind(this), true, (utils.useCredentials ? (this.mapLoaderUrl.indexOf(this.map.url.baseUrl) != -1) : false), this.map.core.xhrParams);
    return;
};


MapGeodata.prototype.onLoadError = function() {
    if (this.map.killed){
        return;
    }

    this.loadState = 3;
    this.loadErrorTime = performance.now();
    this.loadErrorCounter ++;

    //make sure we try to load it again
    if (this.loadErrorCounter <= this.map.config.mapLoadErrorMaxRetryCount) { 
        setTimeout((function(){ if (!this.map.killed) { this.map.markDirty(); } }).bind(this), this.map.config.mapLoadErrorRetryTime);
    }    

    this.mapLoaderCallError();
};


MapGeodata.prototype.onLoaded = function(data) {
    if (this.map.killed){
        return;
    }

    var size = data.length;
    this.size = size;
    this.fileSize = size;

    this.geodata = data;

    this.cacheItem = this.map.resourcesCache.insert(this.killGeodata.bind(this, true), size);

    this.map.markDirty();
    this.loadState = 2;
    this.loadErrorTime = null;
    this.loadErrorCounter = 0;
    this.mapLoaderCallLoaded();
};

// Returns RAM usage in bytes.
//MapGeodata.prototype.size = function () {
  //  return this.size;
//};

//MapGeodata.prototype.fileSize = function () {
  //  return this.fileSize;
//};

export default MapGeodata;


