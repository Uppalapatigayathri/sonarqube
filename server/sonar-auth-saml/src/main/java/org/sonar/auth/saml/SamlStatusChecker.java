/*
 * SonarQube
 * Copyright (C) 2009-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.auth.saml;

import com.onelogin.saml2.Auth;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static org.sonar.auth.saml.SamlSettings.GROUP_NAME_ATTRIBUTE;
import static org.sonar.auth.saml.SamlSettings.USER_EMAIL_ATTRIBUTE;
import static org.sonar.auth.saml.SamlSettings.USER_LOGIN_ATTRIBUTE;
import static org.sonar.auth.saml.SamlSettings.USER_NAME_ATTRIBUTE;

public class SamlStatusChecker {

  private SamlStatusChecker()  {
    throw new IllegalStateException("This Utility class cannot be instantiated");
  }

  public static SamlAuthenticationStatus getSamlAuthenticationStatus(Auth auth, SamlSettings samlSettings) {

    SamlAuthenticationStatus samlAuthenticationStatus = new SamlAuthenticationStatus();

    try {
      auth.processResponse();
    } catch (Exception e) {
      samlAuthenticationStatus.getErrors().add(e.getMessage());
    }

    samlAuthenticationStatus.getErrors().addAll(auth.getErrors().stream().filter(Objects::nonNull).collect(Collectors.toList()));
    if (auth.getLastErrorReason() != null) {
      samlAuthenticationStatus.getErrors().add(auth.getLastErrorReason());
    }
    samlAuthenticationStatus.setAvailableAttributes(auth.getAttributes());
    samlAuthenticationStatus.setMappedAttributes(getAttributesMapping(auth, samlSettings));

    samlAuthenticationStatus.setWarnings(samlAuthenticationStatus.getErrors().isEmpty() ? generateWarnings(auth, samlSettings) : new ArrayList<>());
    samlAuthenticationStatus.setStatus(samlAuthenticationStatus.getErrors().isEmpty() ? "success" : "error");

    return samlAuthenticationStatus;

  }

  private static Map<String, Collection<String>> getAttributesMapping(Auth auth, SamlSettings samlSettings) {
    Map<String, Collection<String>> attributesMapping = new HashMap<>();

    attributesMapping.put("User login value", auth.getAttribute(samlSettings.getUserLogin()));
    attributesMapping.put("User name value", auth.getAttribute(samlSettings.getUserName()));

    samlSettings.getUserEmail().ifPresent(emailFieldName -> attributesMapping.put("User email value", auth.getAttribute(emailFieldName)));

    samlSettings.getGroupName().ifPresent(groupFieldName -> attributesMapping.put("Groups value", auth.getAttribute(groupFieldName)));

    return attributesMapping;
  }

  private static List<String> generateWarnings(Auth auth, SamlSettings samlSettings) {
    List<String> warnings = new ArrayList<>();
    warnings.addAll(generateMappingWarnings(auth, samlSettings));
    return warnings;
  }

  private static List<String> generateMappingWarnings(Auth auth, SamlSettings samlSettings) {
    Map<String, String> mappings = Map.of(
      USER_NAME_ATTRIBUTE, samlSettings.getUserName(),
      USER_LOGIN_ATTRIBUTE, samlSettings.getUserLogin(),
      USER_EMAIL_ATTRIBUTE, samlSettings.getUserEmail().orElse(""),
      GROUP_NAME_ATTRIBUTE, samlSettings.getGroupName().orElse(""));
    List<String> warnings = new ArrayList<>();

    mappings.forEach((key, value) -> {
      if (!value.isEmpty() && (auth.getAttribute(value) == null || auth.getAttribute(value).isEmpty())) {
        warnings.add(String.format("Mapping not found for the property %s, the field %s is not available in the SAML response.", key, value));
      }
    });

    return warnings;
  }
}
