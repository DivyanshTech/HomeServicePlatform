const Category=require('../models/Category');

const categories=[
  ['Plumber','Pipes, taps, leaks and bathroom repairs','🔧'],
  ['Electrician','Wiring, switches, fans and electrical repairs','⚡'],
  ['AC Repair','AC servicing, installation and repairs','❄️'],
  ['Carpenter','Furniture, doors and woodwork','🪚'],
  ['Appliance Repair','Home appliance diagnosis and repair','🔌'],
  ['Painter','Interior and exterior painting','🎨'],
  ['Cleaning','Home and deep cleaning services','🧹']
];

async function ensureCategories(){
  for(const [name,description,icon] of categories){
    await Category.updateOne({name},{$set:{description,icon,isActive:true}},{upsert:true});
  }
}

if(require.main===module){
  require('dotenv').config();
  const connectDB=require('../config/db');
  (async()=>{
    await connectDB();
    await ensureCategories();
    console.log('Categories seeded');
    process.exit(0);
  })().catch(e=>{console.error(e);process.exit(1)});
}

module.exports={ensureCategories};
