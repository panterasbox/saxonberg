inherit ObjectCode;

#include "path.h"

void extra_create()
  {
  set( "id", ({ "echo", "shop echo" }) );
  set( "long", "There isn't anything like that here." );
  set( InvisP, 1 );
  enable_commands();
  set("droppable",0);
  set("gettable",0);
  }

void catch_tell( string str )
  {
  object *arr;
  int x;
  if( invalid_string( str ) )
    return;
  arr = all_inventory( FINDO( STAGE ) || load_object(STAGE) );
  for( x=0; x<sizeof(arr); x++ )
    {
    if( arr[x] != THISP )
    if( interactive( arr[x] ) )
      {
      tell_object( arr[x] , strformat( "Down off of the stage, "
        + str ) );
      }
    }
  }
