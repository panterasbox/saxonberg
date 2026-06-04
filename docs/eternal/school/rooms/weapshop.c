#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

object shop_obj;

void extra_create()
{

   shop_obj = clone_object(ShopCode);
   move_object( shop_obj, THISO );

   shop_obj->add( "valid_properties", ({ WeaponP }) );

   shop_obj->add("permanent_item", WEAPONS+"dagger"); 
   shop_obj->add("permanent_item", WEAPONS+"axe"); 
   shop_obj->add("permanent_item", WEAPONS+"sword");  
   shop_obj->add("permanent_item", WEAPONS+"bbgun"); 
   shop_obj->add("permanent_item", WEAPONS+"bat"); 
   
   set("short", "Newbie School Weapons Shop");
   set("day_long",
      "This is the Newbie School Weapons Shop.  Shops are located at various "
      "locations throughout the mud, and are a good place to buy and sell "
      "equipment.  Some shops will let you buy and sell almost anything, "
      "but most of them are limited.  This shop, for example, will only "
      "let you buy and sell weapons.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "west" : ROOMS+"hall9"
   ]) );
   

}
