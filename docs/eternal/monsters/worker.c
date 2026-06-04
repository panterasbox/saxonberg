inherit MonsterCode;
 
void extra_create()
  {
  set_name( "worker" );
  add_alias( "dwarf" );
  add_alias( "man" );
  add_alias( "construction worker" );
  set_short( "a construction worker" );
  set_long(
    "This is a construction worker.  He is blue." );  
  set_race( "dwarf" );
  set_gender( "male" );
  set( NoCombatP, 1 );
  }
 
west_thing()
  {
  string formality;
  switch( THISP->query_gender() )
    {
    case("male") :
      formality = " sir, ";
      break;
    case("female") :
      formality = " ma'am, ";
      break;
    default :
      formality = ", ";
      break;
    }
  if( THISP->query_ok_by_pete() == "hell yeah!" 
    || THISP->query_wizard()
    )
    {
    command( "say Hello" + formality + "go right on in.\n" );
    return 0;
    }
  tell_room( ENV(THISP), strformat( "The construction worker "
    "blocks " + PNAME + " as " + subjective(THISP) + 
    " attempts to enter the construction site." ), ({THISP}) );
  write( "You are blocked by the construction worker.\n" );
  command( "say I'm sorry" + formality + "but that area is "
    "restricted to project associates only.", THISO );
  return 1;
  }
