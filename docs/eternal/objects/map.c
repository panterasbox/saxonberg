/* map.c */
#include "/zone/null/eternal/eternal.h"
#include "/zone/null/eternal/map/map.h"

inherit NewThingCode;

extra_create()
{
  seteuid(getuid());
  set_ids( ({ "map", "map of Eternal City" }) );
  set_short( "a map of Eternal City" );
  set_value( 0 );
  set_weight( 1 );
}

varargs string long( string arg, object who ) 
{ 
    return MAP_SERVER->get_map_for( who );
}

drop()
{
    if( this_verb()=="give" || this_verb()=="put" ) return 0;
   write("As you drop the map, it suddenly catches flame and is consumed.\n");
   say("As " +PNAME+ " drops a map, it bursts into flames and is consumed.\n");

   destruct(THISO);
   return 0;
}
