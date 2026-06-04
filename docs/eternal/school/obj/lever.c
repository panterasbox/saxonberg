inherit ObjectCode;
#include "../defs.h"

void extra_create()
{
   set("id",  ({ "lever" }) );
   set("short","a lever");
   set("long", "A lever sits in the ground here.  If you <pull> it, "
      "the balloon will take off.");
   set("gettable", 0);
}
