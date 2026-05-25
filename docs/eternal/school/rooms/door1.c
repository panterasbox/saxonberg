inherit DoorObjCode;

void extra_create()
{
   set( "id", ({ "door", "maple door" }) );
   set( "closeable", 1 );
   set( "lockable", 0 );
   set( "obvious", 0 );
   set( "closed", 1 );
   set( "short", "A grand maple door" );
}
   
string long(string arg)
{
   string str;
   int width;

   if( query("closed") == 1 ){
      str="This door is 12 feet tall and made entirely from maple.  "
          "It leads into the newbie academy.  Perhaps you should try "
          "to <open> it.";
   }
   else {
      str="This door is 12 feet tall and made entirely from maple.  "
          "It leads into the newbie academy.  It is open right now, but "
          "you can probably <close> it if you want.";
   }
   width=( THISP ? THISP->query_page_width()-2 : 78 );
   return( format( str, width ) );
}
