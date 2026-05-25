inherit ArmorCode;
#include "../defs.h"

void extra_create()
{
   set_ids( ({ "helmet", "tinfoil helmet" }) );
   set_short( "a flimsy tinfoil helmet" );
   set_long( "This is a small piece of tinfoil folded into a triangle.  Aside "
      "from keeping the strange voices out, you're not sure if it offers much "
      "protection, but it's better than nothing." );
   set_material("tin");
   set_base_ac( 1 );
// set_weight( 100 );
   set("value", 15);
   set( "areas", ({ "head" }) );
}
