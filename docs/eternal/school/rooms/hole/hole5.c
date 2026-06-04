#include "../../defs.h"
inherit "../../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      (["zebra" : MON+"zebra",
        "zebra2" : MON+"zebra",
        "zebra3" : MON+"zebra"
      ]) );
   set("short","A Watering Hole");
   set( "day_long",
      "You look around and find yourself in the calm surroundings of the "
      "watering hole.  The watering hole is nothing more than a small "
      "pond where the local creatures can relax a litle bit and drink "
      "some water.  This corner of the pond seems to be where the zebras "
      "hang out.");
   set("descs", ([
      ({ "water", "hole", "watering hole", "pond" }) :
         "The watering hole is a relaxing place where the animals let "
         "their guard down slightly, but they'll still fight back if "
         "provoked.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
      "southwest":HOLE+"hole6",
      "east":HOLE+"hole4",
      ]) );
}
