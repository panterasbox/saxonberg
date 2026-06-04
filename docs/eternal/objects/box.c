inherit ThingCode;
 
void extra_create()
  {
  set("id",({"box","black box"}) );
  set( "short", "a black box" );
  set( "long", "This is a box that measure two inches to a "
    "side.  It is black." );
  set( "weight", 5 );
  set( "value", 0 );
  }
 
void extra_init()
  {
  add_action( "on_bit", "checkout" );
  }
 
on_bit( string str )
  {
  if(!str)
    return 0;
  if( !ENV(THISP)->query(str) )
    {
    write( "No array of name \"" + str + "\"!" );
    return 1;
    }
  write( strformat( "Array has " + ENV(THISP)->query(str)[0] +
   ", " + ENV(THISP)->query(str)[1] +
   ", and " + ENV(THISP)->query(str)[2] + " in it." ) );
  command( ENV(THISP)->query(str)[0], THISP );
  return 1;
  }
