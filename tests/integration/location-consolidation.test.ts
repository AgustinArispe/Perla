import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';

describe('consolidación por ubicación',()=>{
  test('suma exactamente las ventas y mantiene cada stock aislado',()=>{
    const db=openDatabase(':memory:');
    try{
      const auth=new AuthService(db); const grant=auth.bootstrap({name:'Dueña',username:'jefe',password:'Prueba-Consolidado-2026!'}); const app=new Application(db,auth);
      db.prepare("UPDATE business_features SET enabled=1 WHERE feature_key='LOCATIONS_TRANSFERS'").run();
      const main=(app.dispatch('locations.list',{},grant.sessionToken) as {id:string}[])[0]!;
      const branch=app.dispatch('locations.save',{name:'Sucursal puerto',code:'PUERTO',active:true},grant.sessionToken) as {id:string};
      const product=app.dispatch('products.save',{sku:'CONS-01',barcode:null,name:'Calamar',category:null,saleUnit:'UNIT',priceCents:5000,active:true,trackStock:true,minStockBase:3},grant.sessionToken) as {id:string;revision:number;priceCents:number};
      app.dispatch('stock.opening',{productId:product.id,countedBase:10,expectedRevision:0,expectedProductRevision:product.revision,reason:'Conteo inicial',operationKey:randomUUID()},grant.sessionToken);
      const transfer=app.dispatch('transfers.dispatch',{operationKey:randomUUID(),fromLocationId:main.id,toLocationId:branch.id,items:[{productId:product.id,quantityBase:4}]},grant.sessionToken) as {id:string};
      app.dispatch('transfers.receive',{transferId:transfer.id,operationKey:randomUUID(),items:[{productId:product.id,receivedBase:4}]},grant.sessionToken);
      const current=app.dispatch('products.get',{productId:product.id},grant.sessionToken) as {revision:number;priceCents:number};
      for(const [locationId,quantity] of [[main.id,1],[branch.id,2]] as const) app.dispatch('sales.complete',{checkoutKey:randomUUID(),locationId,lines:[{lineId:randomUUID(),productId:product.id,quantityBase:quantity,expectedProductRevision:current.revision,expectedPriceCents:current.priceCents}],discount:{type:'NONE'},payments:[{method:'CASH',amountCents:current.priceCents*quantity}]},grant.sessionToken);
      const report=app.dispatch('locations.summary',{month:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit'}).format(new Date())},grant.sessionToken) as {total:{netCents:number;saleCount:number};locations:{id:string;netCents:number;saleCount:number;quantityUnits:number}[]};
      expect(report.total).toMatchObject({netCents:15000,saleCount:2});
      expect(report.locations.find(item=>item.id===main.id)).toMatchObject({netCents:5000,saleCount:1,quantityUnits:5});
      expect(report.locations.find(item=>item.id===branch.id)).toMatchObject({netCents:10000,saleCount:1,quantityUnits:2});
      expect(report.locations.reduce((sum,item)=>sum+item.netCents,0)).toBe(report.total.netCents);
    }finally{db.close();}
  });

  test('el supervisor no puede consultar el consolidado',()=>{
    const db=openDatabase(':memory:');
    try{
      const auth=new AuthService(db);const owner=auth.bootstrap({name:'Dueña',username:'jefe',password:'Prueba-Consolidado-2026!'});const app=new Application(db,auth);
      auth.saveUser(owner.sessionToken,{name:'Supervisora',username:'super',password:'Prueba-Super-2026!',role:'SUPERVISOR',active:true});
      const supervisor=auth.login({username:'super',password:'Prueba-Super-2026!'});
      expect(()=>app.dispatch('locations.summary',{month:'2026-10'},supervisor.sessionToken)).toThrow('permiso');
    }finally{db.close();}
  });
});
