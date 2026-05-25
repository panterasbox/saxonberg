#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{

    set( "reset_data", ([
	 "bank_obj": StorageCode,
      ]) );
   
   set("short", "Newbie School Lockers");
   set("day_long",
      "This is the Newbie School Lockers.  Lockers are a storage place for "
      "you to store spare equipment.  Putting things in the locker is free, "
      "but you have to pay to take them out, and there's always a small chance "
      "that a locker thief will steal your items when you try to retrieve them.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "west" : ROOMS+"hall7"
   ]) );
   

}
