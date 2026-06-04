#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;
 
void extra_create() {
  set( "id", ({
    "corpse",
    "pale-faced drunkard",
    "corpse of pale-faced drunkard",
    "pale-faced drunkard's corpse"
    }) );
  set( "short", "the corpse of a pale-faced drunkard" );
  set( "long", "This is the decaying body of some drunkard.  "
    "Death seems to have occured through overintoxication." );
  set( "value", 0 );
  set( "weight", 4000 );
  }
