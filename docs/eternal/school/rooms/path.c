#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("short","A Gravel Path");
   set( "day_long",
      "You find yourself on a meandering gravel path.  It looks "
      "rather unkempt, with weeds growing throughout the gravel.  "
      "You hear noises off to the northwest, but they seem strangely "
      "calm.  As you walk down the path, you realize that you have left "
      "the wheat fields and entered the jungle.");
   set("descs", ([
      ({ "gravel", "path" }) :
         "The path has fallen into disrepair, with weeds now covering "
         "almost as much ground as gravel.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", ([
      "east":ROOMS+"wheat20",
      "northwest":HOLE+"hole1",
      ]) );
}
