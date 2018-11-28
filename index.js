const {
  spinalContextMenuService,
  SpinalContextApp
} = require("spinal-env-viewer-context-menu-service");
const spinalgraph = require("spinalgraph");


const {
  spinalPanelManagerService,
  SpinalMountExtention
} = require("spinal-env-viewer-panel-manager-service");

const {
  SpinalForgeExtention
} = require("spinal-env-viewer-panel-manager-service_spinalforgeextention");

import Vue from "vue";
import aVueCompoment from "./mypanel.vue";


function middleware(node) {
  let obj = {};
  let name = node.info.name.get();
  obj[name] = { _info : { relation: Object.keys(node.parents).pop() } };
  RecursiveGraphToJson(node, obj, name, node).then(ok => JsonToCsv(obj));
}

function equipmentJsonDetails(node) {
  let obj = {};
  for (var key in node.info._attribute_names)
    if (node.info._attribute_names[key] !== 'id' && node.info._attribute_names[key] !== 'hooks'
      && node.info._attribute_names[key] !== 'name' && node.info._attribute_names[key] !== 'color'
      && node.info._attribute_names[key] !== 'type')
      obj[node.info._attribute_names[key]] = node.info[node.info._attribute_names[key]].get();
    obj.relation = Object.keys(node.parents).pop();
    return obj;
  }

  function RecursiveGraphToJson(node, json, key, context) {
    return new Promise(async (resolve) => {

      let result = await node.getChildrenInContext(context);

      if ( result.length !== 0 ) {
        let iterator = 0;
        let tab = [];
        json[key].childrens = {};
        while (iterator < result.length) {

          json[key].childrens[result[iterator].info.name.get()] = { "_info": { "relation": Object.keys(result[iterator].parents).pop() } };
          if (json[key].childrens[result[iterator].info.name.get()]._info.relation === "HasEquipment")
            json[key].childrens[result[iterator].info.name.get()]._info = equipmentJsonDetails(result[iterator]);

          tab.push(RecursiveGraphToJson(result[iterator], json[key].childrens, result[iterator].info.name.get() , context));
          iterator++;
        }
        Promise.all(tab).then(arr => resolve(arr)).catch(err => console.log(err));
      } else
      resolve(1);
    })
  }

  function JsonToCsv(json) {
    let header = [];
    let result = {};
    let tab = [];
    let keys = Object.keys(json);

    for (let i = 0; i < keys.length; i++) {
      tab.push(JsonTransform(json[keys[i]].childrens, keys[i], json[keys[i]]._info.relation));
    }

    Promise.all(tab).then(render => DoSomething(render[0]));
  }

  function DoSomething(arr) {
    let ite = 0;
    let fields = `"${arr[0][0][1].replace(/,/g, '","')}"`;
    let data = [ regexForFieldsCsv(fields) ];
    let tmp;

    while(ite < arr.length) {
      data.push(`"${arr[ite][0][0].replace(/,/g, '","')}"`);
      ite++;
    }
    console.log(data);
    download('export.csv', data);
  }

  const regexForFieldsCsv = (str) => str.replace(/HasContext/g, 'context').replace(/HasFloor/g, 'Floor').replace(/HasRoom/g, 'Room').replace(/HasZone/g, 'Zone').replace(/HasEquipment/g, 'Equipment');

  function getEquipmentDetails(json)
  {
    let keys = Object.keys(json);
    let iterator = 0;
    let fields = [];
    let index = keys.indexOf("relation");
    if (index > -1)
      keys.splice(index, 1);

    while (iterator < keys.length) {
      fields.push(json[keys[iterator]]);
      iterator++;
    }
    let result = {result: fields.toString(), fields: keys.toString()};
    return result;
  }

  function JsonTransform(json, result, fields) {
    return new Promise((resolve) => {
      let keys;
      let i = 0;
      let tab = [];
      keys = Object.keys(json);

      while (i < keys.length){
        if (!json[keys[i]].childrens) {
          let details = getEquipmentDetails(json[keys[i]]._info);
          result = `${result},${keys[i]},${details.result}`;
          fields = `${fields},${json[keys[i]]._info.relation},${details.fields}`;
          return resolve([result, fields]);
        }
        else
          tab.push(JsonTransform(json[keys[i]].childrens, `${result},${keys[i]}`, `${fields},${json[keys[i]]._info.relation}`));
        i++;
      }
      Promise.all(tab).then(result => resolve(result));
    })
  }

  function download(filename, arr) {
    let element = document.createElement('a');
    let doc = '';
    for (var key in arr) {
      doc += `${arr[key]}\n`;
    }  
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(doc));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  class SpinalContextExport extends SpinalContextApp {
    constructor() {
      super("export-csv", "Export csv format", {
        icon: "get_app",
        icon_type: "in"
      });
    }

    isShown(option) {
  //  if (option.testsFail === true) return Promise.resolve(-1);
  return Promise.resolve(true);
}

action(option) {
    //spinalPanelManagerService.openPanel("mypanel", option);
    middleware(option.context);
  }
}

// create a node
const extentionCreated = SpinalForgeExtention.createExtention({
  name: "mypanel",
  vueMountComponent: Vue.extend(aVueCompoment),
  // toolbar is optional
  toolbar: {
    icon: "done",
    label: "testLabel",
    subToolbarName: "spinalcom"
  },
  panel: {
    title: "Spinalcom Panel",
    classname: "spinal-pannel",
    closeBehaviour: "hide" // if something else panel is deleted
  },
  style: {
    left: "405px"
  },
  onload: () => {},
  onUnLoad: () => {}
});


spinalContextMenuService.registerApp("GraphManagerSideBar", new SpinalContextExport());
SpinalForgeExtention.registerExtention("mypanel", extentionCreated);
