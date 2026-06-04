#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

object shop_obj;

void extra_create()
{

   shop_obj = clone_object(ShopCode);
   move_object( shop_obj, THISO );

   shop_obj->add( "valid_properties", ({ ArmorP, ShieldP }) );

   shop_obj->add("permanent_item", ARMOR+"helmet"); 
   shop_obj->add("permanent_item", ARMOR+"jeans"); 
   shop_obj->add("permanent_item", ARMOR+"mittens"); 
   shop_obj->add("permanent_item", ARMOR+"shield"); 
   shop_obj->add("permanent_item", ARMOR+"vest"); 
   
   set("short", "Newbie School Armor Shop");
   set("day_long",
      "This is the Newbie School Armor Shop.  Shops are located at various "
      "locations throughout the mud, and are a good place to buy and sell "
      "equipment.  Some shops will let you buy and sell almost anything, "
      "but most of them are limited.  This shop, for example, will only "
      "let you buy and sell armor.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "east" : ROOMS+"hall9"
   ]) );
   

}
