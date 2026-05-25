inherit MonsterCode;
 
#include "path.h"
#include "/zone/null/eternal/perko/bobcode.h"
 
// poet.mov       - coffee-buying neutral state
// poet2.mov      - pete/poet interaction.  transition to
//                    poem recital
// <poemname>.mov - poem recital
// poet3.mov      - pete/poet interaction. 
 
void extra_create()
  {
  set_name( "Joe" );
  add_alias( "joe" );
  add_alias( "poet" );
  add_alias( "squizzo" );
  add_alias( "joe squizzo" );
  set_short( "Joe Squizzo, Poet Extraordinaire" );
  set_long(
     "This fellow seems to be your average college-aged random person, "
     "and he seems to be spouting that new surreal random poetry.  Flee "
     "whilst you can, for he _is_ randomness incarnate." );
  set_race("human");
  set_gender("male");
  set_toughness( 1 );
  mp_setup( NPC "poet" );
  set( "lastmp", NPC "poet" );
  }
 
sit_down()
  {
  set_short( "Joe Squizzo, Poet Extraordinaire[sitting]" );
  say( "Joe takes a seat at a table over in the corner.\n" );
  return 0;
  }
 
stand_up()
  {
  set_short( "Joe Squizzo, Poet Extraordinaire" );
  say( "Joe pulls himself to his feet.\n" );
  return 0;
  }
 
load_rack( string *tmp )
  {
  object rack;
  if( objectp( rack = present( "mug rack", ENV(THISO)) ) )
    rack -> create();
  return 0;
  }
 
startpoem()
  {
  string *list;
  list = grab_file( POETRY "poetry_list" );
  mp_setup( POETRY + list[random( sizeof( list ) )] );
  return 1;
  }
 
stop_poem()
  {
  mp_setup( NPC "poet3" );
  return 1;
  }
 
end_poem()
  {
  object pete;
  if( pete = present( "pete", ENV(THISO)) )
    {
    pete -> mp_setup( NPC "pete5" );
    return 0;
    }
  mp_setup( NPC "poet" );
  return 1;
  }
