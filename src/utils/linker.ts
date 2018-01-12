import * as express from "express";
import {readFile, readFileSync} from 'fs';
let app = express()
var defaultHtml = readFileSync("src/html/link.html")

export default function(args: any): Promise<any> {
  return new Promise((resolve: any, reject: any) => {
    let port = args.port;
    console.log("Webserver started on http://localhost:"+port)
    console.log("Please go to this page with a browser using MetaMask extension")
    app.use(express.static('public'))
    app.get('/:sceneName', function (req, res) {
      const root = args.isDev ? `tmp/${req.params.sceneName}` : `./${req.params.sceneName}`;
      readFile(root+"/scene.json", (err, data)=>{
        if(err){
          res.send('You typed a wrong project name')
          return err
        }
        else {
          var _data = JSON.parse(data)
        }
        var rendered = defaultHtml.toString().replace(/#_data#/g, JSON.stringify(_data)).replace("#web3#", readFileSync("src/html/web3.min.js"))
        if(_data.scene.parcels.length == 1){
          rendered = rendered.replace('#x#', _data.scene.parcels[0].split(',')[0]).replace('#y#', _data.scene.parcels[0].split(',')[1])
        }else{
          let x = []
          let y = []
          for (var coords in _data.scene.parcels) {
            x.push(coords.split(",")[0]);
            y.push(coords.split(",")[1]);
          }
          rendered = rendered.replace('#x#', JSON.stringify(x)).replace('#y#', JSON.stringify(y)).replace('updateLandData', 'updateManyLandData')
        }
        res.send(rendered)
      })
    })

    app.listen(port)
  });
}
