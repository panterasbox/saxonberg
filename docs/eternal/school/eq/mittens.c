inherit ArmorCode;
#include "../defs.h"

void extra_create()
{
   set_ids( ({ "mittens", "wool mittens" }) );
   set_short( "a tattered pair of wool mittens" );
   set_long( "These mittens look like they've had better days.  Moths have " 
      "eaten several holes in them, and they're barely hanging on to their "
      "original shape.  At least your hands will be warm." );
   set_material("wool");
   set_base_ac( 1 );
// set_weight( 100 );
   set("value", 10);
   set( "areas", ({ "right hand", "left hand" }) );
}
