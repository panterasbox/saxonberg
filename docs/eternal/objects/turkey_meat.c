inherit ObjectCode;
 
#define BONE "turkey_bone"
 
void extra_create()
  {
  add("id","turkey");
  add("id","chicken");
  add("id","meat");
  add("id","hunk of meat");
  add("id","hunk of turkey");
  add("id","the bane of all australians");
  add("id","nice roasted turkey");
  add("id","roasted turkey");
  add("id","nice turkey");
  set("short","a tasty hunk of turkey");
  set("long",
    "  You pause for a moment to inhale deeply.  \"Ahh..,\" "+
    "you think to yourself, \"This turkey smells absolutely "+
    "scrumdiddlyumptious!\"  You feel yourself fighting to "+
    "resist the urge to <eat turkey>");
  set("weight",7);
  set("value",0);
  }
 
extra_init() 
  {
  add_action("eat_turkey","eat");
  add_action("eat_turkey","consume");
  add_action("eat_turkey","gobble");
  add_action("eat_turkey","inhale");
  }
 
eat_turkey(string str)                    
  {
  if( !str )
    {
    write( capitalize(query_verb()) + " what?\n" );
    return 1;
    }
  if( !id(str) )
    {
    return 0;
    }
  say( PNAME + " takes a few moments to consume a tasty chunk o' turkey.\n");
  write("You take a few moments to consume the tasty chunk o' turkey.\n");
  command("gossip God bless the good ol' U.S. of A!!", THISP);
  move_object(clone_object(BONE),THISP);
  destruct(THISO);
  return 1;
  }
 
 
/*    This bit taken from Locus' rose thing..  That's just since  */
/*  I don't really know how to do this part myself..              */
 
status drop()
{
    ::drop();
    call_out( "check", 1 );
    return( 0 );
}
 
void check()
{
    if( !living( ENV( THISO ) ) )
    {
        tell_room( ENV( THISO ),"A turncoat Australian leaps "+
          "out of the shadows and grabs the hunk of turkey,\n"+
          "running away to hide and enjoy Thanksgiving in "+
          "secret.\n" );
        destruct( THISO );
    }
}
