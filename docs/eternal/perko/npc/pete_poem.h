quikpoem( string str )
  {
  object poet;
  if( poet = present( "poet", ENV(THISO)) )
    {
    command( "say Hey Joe!", THISO );
    set( "customer", poet );
    poet -> mp_setup( NPC "poet2" );
    mp_setup( NPC "pete2" );
    set( "last_mp", NPC "pete4" );
    return 1;
    }
  mp_setup( NPC "pete3" );
  return 1;
  }
poemcheck( string *tmp )
  {
  object poet;
  if( random(10) == 3 )
    {
    if( poet = present( "poet", ENV(THISO)) )
      {
      command( "say Hey Joe!", THISO );
      set( "customer", poet );
      poet -> mp_setup( NPC "poet2" );
      mp_setup( NPC "pete2" );
      set( "last_mp", NPC "pete4" );
      return 1;
      }
    mp_setup( NPC "pete3" );
    return 1;
    }
  return 0;
  }
  
poetcheck()
  {
  object poet;
  if( poet = present("poet", ENV(THISO)) )
    {
    set( "customer", poet );
    command( "say There you are!", THISO );
    mp_setup( NPC "pete2" );
    poet -> mp_setup( NPC "poet2" );
    set( "last_mp", NPC "pete4" );
    return 1;
    }
  return 0;
  }
 
startlisten()
  {
  set( "customer", 0 );
  mp_setup( NPC "pete4" );
  return 1;
  }

clone_espresso()
  {
  move_object( clone_object( COFFEE + "espresso" ), THISO );
  return 0;
  }
