/*
Monster created w/ Torenthal's Monster Generator
Please leave the above line in the monster for future use
*/
inherit MonsterCode;

prototype_setup()
{
   set_name("draconian");
   add_alias("leader");
   add_alias("monster");
   set_race("draconian");
   set_short("a draconian leader");
   set_long("This leader looks cratfy and mean!  Looks like he'll kick yer\n"+
            "butt from one end o' town to the other while humming his\n"+
            "favorite tune.\n");
   set_al(-10);
   set_hp(1500);
   set_fatigue(1000);
   set_wc(10);
   set_ac(3);
   set_offensive_level(25);
   set_defensive_level(25);
   set_aggressive(0);
   set_stat("str",250);
   set_stat("int",40);
   set_stat("wil",150);
   set_stat("con",200);
   set_stat("dex",100);
   set_stat("cha",80);
}

init()
{
   ::init();
}

extra_create()
{
  object obj;
  
  obj = clone_object("/examples/armor/plate.c");
  if (obj)
    {
      obj->set_size(11);
      move_object(obj, THISO);
      THISO->wear_armor(obj);
    }
  
  obj = clone_object("/examples/armor/magic/bracers.c");
  if (obj)
    {
      obj->set_size(12);
      move_object(obj, THISO);
      THISO->wear_armor(obj);
    }
  
  
  obj = clone_object("/examples/weapon/special/special_long_sword.c");
  if (obj)
    {
      move_object(obj, this_object());
      THISO->wield_weapon(obj);
    }
}

