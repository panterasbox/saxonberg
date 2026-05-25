/* Gwain the Shopkeeper */
/* Small mod by Min, etc */

#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
#include "monster.h"

void extra_create()
{
    set_name("gwain");
    add_alias("Gwain");
    add_alias("shopkeeper");
    set_short("Gwain, the owner of Paranoid Clothing & Apparel");
    set_long("Before you stands a short halfling man.  His eyes bug out "+
      "wildly as he notices you staring at him, and says, \"What!?  Why "+
      "are you staring at me!?\" and looks quickly away.  Then he says, "+
      "\"Oh!  By the way...  Let me know if you need anything.\"  Great "+
      "service here, eh?");
    set_race("halfling");
    set_alignment(30);
    set_toughness( 30 );
    set_type("blunt");
    add_prop( NoCharmP );
}

