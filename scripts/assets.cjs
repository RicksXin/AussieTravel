const fs=require('fs'),path=require('path'),sharp=require('sharp');
async function main(){
 const dir=path.resolve('src/assets');fs.mkdirSync(dir,{recursive:true});
 let imports='',mapping='';
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.svg')&&f!=='coast.svg')){
  const name=path.basename(file,'.svg'),svg=fs.readFileSync(path.join(dir,file));
  await sharp(Buffer.from(svg)).resize(72,72).png().toFile(path.join(dir,`${name}.png`));
  imports+=`import ${name} from './${name}.png'\n`;mapping+=`${name},`;
 }
 const scene=fs.readFileSync(path.join(dir,'coast.svg'));
 await sharp(Buffer.from(scene)).resize(1180,540).png().toFile(path.join(dir,'coast.png'));
 fs.writeFileSync(path.join(dir,'icons.js'),imports+`export default {${mapping}}\n`);
 console.log('Generated local PNG illustrations and icons');
}
main().catch(e=>{console.error(e);process.exit(1)});
