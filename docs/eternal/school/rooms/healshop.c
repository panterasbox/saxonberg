#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

object shop_obj;

void extra_create()
{

   shop_obj = clone_object(ShopCode);
   move_object( shop_obj, THISO );

   shop_obj->add( "valid_properties", ({ HealingP }) );

   shop_obj->add("permanent_item", OBJ+"beer"); 
   shop_obj->add("permanent_item", OBJ+"crackers"); 
   shop_obj->add("permanent_item", OBJ+"umbrelladrink"); 
   shop_obj->add("permanent_item", OBJ+"powerbar"); 
   
   set("short", "Newbie School Heal Shop");
   set("day_long",
      "This is the Newbie School Heal Shop.  Shops are located at various "
      "locations throughout the mud, and are a good place to buy and sell "
      "equipment.  Some shops will let you buy and sell almost anything, "
      "but most of them are limited.  This shop, for example, will only "
      "let you buy and sell heals.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "southeast" : ROOMS+"hall9"
   ]) );
   

}
