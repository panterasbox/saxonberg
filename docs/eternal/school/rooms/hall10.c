#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   
   set("short", "Newbie School Basement");
   set("day_long",
     "You have reached the end of the Newbie School.  Remember the lessons "
     "you have learned here, and you will have a leg up on the other "
     "newbies.  There is always more to learn though...remember that the "
     "newbie channel exists for the sole purpose (in theory) of answering "
     "newbies' questions.  There are also help files for most of the "
     "commands on the mud, and it is never a bad idea to read them.  "
     "If you'd like to leave the newbie school, type <lounge>.  If you "
     "would like to go to the Newbie School Farm and kill a few more "
     "monsters in relative safety first, type <farm>.  Once you are back "
     "in the lounge, remember a few things.  The room directly down from "
     "the lounge (the Heart of Eternal City) is a dangerous room, and you "
     "should never hang out there.  Guilds are located around Eternal City, "
     "a little exploring will reveal most if not all of them.  Experience "
     "can be spent on stats or skills.  Stats can be purchased at several "
     "places throughout the mud, the nearest one being 4 west and 2 south "
     "from the Heart.  Good luck, you'll need it.  Welcome to the End of the "
     "Line.");

   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "north" : ROOMS+"hall9",
      "farm" : ROOMS+"wheat00",
      "lounge" : LOUNGE
   ]) );
   

}
