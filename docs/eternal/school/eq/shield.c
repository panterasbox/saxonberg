inherit ShieldCode;
#include "../defs.h"

void extra_create()
{
   set( ShieldP, 1 );
   set_ids( ({ "shield", "particle-board shield" }) );
   set_short( "a flimsy particle-board shield" );
   set_long( "This is a small piece of particle board with a handle "
      "so it can be held as a shield.  It probably doesn't offer much "
      "protection, but it's better than nothing." );
   set_material("wood");
   set_base_ac( 1 );
}
