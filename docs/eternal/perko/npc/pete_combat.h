kick_ass_attack( object victim, object attacker )
  {
  if( query("stopper") )
    {
    if(victim->query_wizard())
      {
      command( "say Hey, it's no fun doing my DeathSequence trick with "
        "a wizard!  Leave me to do my business in peace!", attacker );
      attacker -> remove_target( victim );
      attacker -> full_clear_attack();
      victim -> remove_target( THISO );
      command( "say Now where was I?  Ah yes..", attacker );
      return 1;
      }
    command( "say Don't EVEN try to gang up on me!", attacker );
    tell_room( ENV(THISP), strformat( "Pete pulls the trigger "
      "on his massive shotgun!\n"
      "BBB  L    AA  M   M  !\n"
      "B  B L   A  A MM MM  !\n"
      "BBB  L   AAAA M M M  !\n"
      "B  B L   A  A M   M\n"
      "BBB  LLL A  A M   M  !" ) );  
    victim->DeathSequence( attacker, "trying to gang up on Perko Pete" );
    write_file( NPC "died", victim->query_real_name() + "\n" );
    command( "say Now where were we?  Ah yes..", attacker );
    return 1;
    }
  set( "customer", victim );
  tell_room( ENV( attacker ), strformat( "Pete suddenly "
    "whips out the HUGEST BADASS MOTHER-FUCKING SHOTGUN "
    "YOU'VE EVER SEEN IN YOUR ENTIRE LIFE and shoves it "
    "right against " + victim -> query_name() + "'s temple!\n"
    "All action is frozen." ), ({ victim }) );
  tell_object( victim, strformat( "Pete suddenly whips "
    "out the HUGEST BADASS MOTHER-FUCKING SHOTGUN YOU'VE "
    "EVER SEEN IN YOUR ENTIRE LIFE and shoves it right "
    "against your temple!!\nYou stop attacking Pete.\n"
    "You really want to urinate." ) );
  attacker -> remove_target( victim );
  attacker -> full_clear_attack();
  victim -> remove_target( THISO );
  if(victim->query_wizard())
    {
    command( "say Hey, it's no fun doing my DeathSequence trick with "
      "a wizard!  Leave me to do my business in peace!", THISO );
    return 1;
    }
  //set( "stopper", clone_object( NPC "stopper" ) );
  //move_object( query("stopper"), victim );
  //set( "punkass", victim );
  command( "say Do not move.  Do not even type anything or you "
    "will die.  You have three warnings in case you were doing "
    "something stupid like running a script.  That was number 1.",
    THISO );
  tell_object( victim, strformat( "Pete keeps the shotgun "
    "pressed firmly against your head." ) );
  write_file( NPC "tried", victim->query_real_name() + "\n" );
  halt_mp(0);
  return 1;
  }

race_thingy()
  { 
  command( "say I've worked too hard to have some two-bit "
    + lower_case( query("customer")->query_race() ) + 
    " fuck things up!", THISO );
  return 0;
  }  
 
release_punk()
  {
  //query("stopper")->unleash();
  command( "say Ok now scat!  Type either \"quit\" or \"east\".",
    THISO );
  return 0;
  }

vamoose_check()
  {
  if( !present( query("punkass"), ENV(THISO) ) )
    {
    command("say That should be the last of THAT freak!",THISO);
    set("stopper",0);
    set("punkass",0);
    basic_mp();
    return 1;
    }
  return 0;
  }

kill_em_dead()
  {
  //query("stopper")->kill_em_dead();
  return 0;
  }

corpse_thing()
  {
  object poet;
  poet = present( "poet", ENV(THISO) );
  if( !poet = present( "poet", ENV(THISO) ) )
    {
    poet = present( "poet", FINDO(STAGE) );
    if( !poet = present( "poet", FINDO(STAGE) ) )
      {
      poet = clone_object( NPC "poet" );
      tell_room( SHOP, "Joe pushes his way into the shop from the street.\n" );
      move_object( poet, ENV(THISO) );
      command( "say yo wuzzup", poet );
      }
    else
      command( "south", poet );
    }
  poet -> mp_setup( NPC "poet4" );
  return 0;
  }
