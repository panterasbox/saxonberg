inherit ThingCode;
 
void extra_create()
  {
  set( "id", ({
    "turkey",
    "chicken",
    "meat",
    "bone",
    "turkey bone",
    "the bane of all australians",
    "nice roasted turkey",
    "roasted turkey",
    "nice turkey",
    }) );
  set("short","a turkey bone");
  set("long",
    "It's like, a turkey bone.  Deal with it.");
  set("weight",5);
  set("value",0);
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
          "out of the shadows and grabs the turkey bone,\n"+
          "running away to hide and enjoy Thanksgiving in "+
          "secret.\n" );
        destruct( THISO );
    }
}
