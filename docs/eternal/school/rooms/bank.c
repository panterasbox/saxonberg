#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{

    set( "reset_data", ([
	 "bank_obj": BankCode,
      ]) );
   
   set("short", "Newbie School Bank");
   set("day_long",
      "This is the Newbie School Bank.  Like the other banks located in various "
      "locations around the mud, this bank is a safe place to store your coins.  "
      "However, there is a slight charge for using it, and coins kept in the bank "
      "can be taxed.  You may find the 'coins' command useful.");
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "east" : ROOMS+"hall7"
   ]) );
   

}
