#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;
inherit DoorCode;

void extra_init()
{
   add_action( "ReadSign", "read" );
}

void extra_create()
{
   
   set("short", "Newbie School Stat Room");
   set("day_long",
     "This is the stat raising room of the Newbie School.  You can see your "
     "current statistics at any time by typing <score>.  Stats may be raised "
     "at any stat raising room throughout the mud.  Each stat costs a certain "
     "amount of xp to raise, depending on your race and starting stats.  "
     "To raise a stat here, simply type <raise> and the three letter version "
     "of the stat you want to raise (str int wil con dex chr).  Some stats "
     "count more towards your eval than others, depending on what guild "
     "you are in.  For more information on eval, type <help eval> or <help "
     "evaluation>.  To find the cost of raising a particular stat, type "
     "<cost> and the three letter version of the stat.  <cost all> will show "
     "you the cost for all of your stats.  If you'd like to find the cost "
     "to raise a certain stat more than once, you can type (for example) "
     "<cost str 5> and it will tell you how much it would cost to raise "
     "your strength 5 times.  If you buy a calculator from a vending "
     "machine, you can see these costs without going to a stat raising "
     "location.  Look at the statue for more information.");
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "southeast" : ROOMS+"lobby"
   ]) );

set( "reset_data", ([ "statue" : AdvancementCode ]) );
}
