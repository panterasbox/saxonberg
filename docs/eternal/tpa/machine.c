inherit ObjectCode;

void
extra_create()
{
  set( "id", ({ "mac", "machine", "vending machine" }) );
  set("short", "a busted Vending Machine 2.0");
  set("long", "Vending Machine.\nYou can't do much with this "
    "machine, it's broken.\n");
  set("gettable", 0);
  set("dropable", 0);
  set( NoStunP, 1);
  //replace_program(ObjectCode);
  return;
}

int
search(string id)
{
  tell_player(THISP, "Though it is securely locked, you are able to pull "
    "the service door a few milimeters apart from the main body of the "
    "machine...just enough to notice a faint glow on the inside.  It's "
    "probably just the backlight to make the buttons on the machine shine.");
  return 1;
}
