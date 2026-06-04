inherit ArmorCode;
#include "../defs.h"

void extra_create()
{
   set_ids( ({ "jeans", "tattered jeans" }) );
   set_short( "a tattered pair of jeans" );
   set_long( "These jeans have so many holes and patches, you can't even tell "
      "what the original color was any more.  They are completely worn through "
      "on the right upper side.  They look pretty comfortable though, and if "
      "they don't offer much protection, at least you'll be comfy." );
   set_material("cloth");
   set_base_ac( 1 );
// set_weight( 100 );
   set("value", 50);
   set( "areas", ({ "left thigh", "left calf", "right calf" }) );
}
