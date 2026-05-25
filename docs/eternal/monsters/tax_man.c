/* Tax Collector - by Deathdealer 4/14/02
 * Everyone wants a little revenge from time to time, yeah?
 */
inherit MonsterCode;
inherit MonsterMove;

void extra_create()
{
  set_name( "tax collector" );
  add_alias( "tax man" );
  add_alias( "the man" );
  add_alias( "taxman" );
  add_alias( "vermin" );
  add_alias( "scum" );
  set_short( "a tax collector" );
  set_long( "This is an official agent of the Eternal City General "
   "Accounting Office.  No lower form of life exists." );
  set_toughness( 15 );
  set_race( "human" );
  set_gender( "male" );
  set_move_chance( 0 );
  set_move_rate( 25 );
}

status move_monster()
{
  if( THISO->query_money() < 5000 )
    THISO->add_money( random( 10 ) + 1 );
  return ::move_monster();
}
